using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using System.Security.Claims;
using System.Text.Json;
using System.Linq;
using System.Data;
using Microsoft.Data.SqlClient;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/fiscal-recaps")]
[Authorize]
public class EtatsDeSortieController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;

    public EtatsDeSortieController(AppDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private async Task<string> GetCurrentUserRoleAsync(int userId)
    {
        var dbUser = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Role })
            .FirstOrDefaultAsync();

        var roleClaim = User.FindFirst("role")?.Value
            ?? User.FindFirst(ClaimTypes.Role)?.Value
            ?? string.Empty;

        var role = !string.IsNullOrWhiteSpace(dbUser?.Role)
            ? dbUser!.Role.Trim().ToLowerInvariant()
            : roleClaim.Trim().ToLowerInvariant();

        return role;
    }

    private async Task<int?> GetPeriodeIdAsync(string mois, string annee)
    {
        var normalizedMois = (mois ?? string.Empty).Trim();
        var normalizedAnnee = (annee ?? string.Empty).Trim();

        if (!int.TryParse(normalizedMois, out var month)
            || month < 1
            || month > 12
            || !int.TryParse(normalizedAnnee, out var year))
        {
            return null;
        }

        return await _context.Periodes
            .AsNoTracking()
            .Where(p => p.Mois == month && p.Annee == year)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<FiscalPeriode> GetOrCreatePeriodeAsync(string mois, string annee)
    {
        var normalizedMois = (mois ?? string.Empty).Trim();
        var normalizedAnnee = (annee ?? string.Empty).Trim();

        if (!int.TryParse(normalizedMois, out var month)
            || month < 1
            || month > 12
            || !int.TryParse(normalizedAnnee, out var year))
        {
            throw new InvalidOperationException("Période invalide.");
        }

        var existing = await _context.Periodes
            .FirstOrDefaultAsync(p => p.Mois == month && p.Annee == year);

        if (existing is not null)
            return existing;

        var periode = new FiscalPeriode
        {
            Mois = month,
            Annee = year,
        };

        _context.Periodes.Add(periode);
        await _context.SaveChangesAsync();
        return periode;
    }

    private static decimal ParseDecimal(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var numeric))
            return numeric;

        var text = element.ToString();
        if (string.IsNullOrWhiteSpace(text))
            return 0m;

        var normalized = text.Trim().Replace(" ", string.Empty).Replace(",", ".");
        if (decimal.TryParse(normalized, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        return 0m;
    }

    private static string NormalizeRecapKey(string key)
    {
        return (key ?? string.Empty).Trim().ToLowerInvariant();
    }

    private async Task PersistRecapRowsAsync(string key, int periodeId, JsonElement rows)
    {
        var normalizedKey = NormalizeRecapKey(key);

        if (normalizedKey == "tva_collectee")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVACollecte] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var ttc = row.TryGetProperty("ttc", out var ttcElement) ? ParseDecimal(ttcElement) : 0m;
                var exonere = row.TryGetProperty("exonere", out var exonereElement) ? ParseDecimal(exonereElement) : 0m;
                var ht = row.TryGetProperty("ht", out var htElement) ? ParseDecimal(htElement) : 0m;
                var tva = row.TryGetProperty("tva", out var tvaElement) ? ParseDecimal(tvaElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TVACollecte] ([id_designiation_encaissement], [id_periode], [EncaissementTTC], [Exonere], [EncaissementHT], [TVA])
SELECT [id], {periodeId}, {ttc}, {exonere}, {ht}, {tva}
FROM [dbo].[TVACollecte_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "tva_situation")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVADeductible] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var immo = row.TryGetProperty("immo", out var immoElement) ? ParseDecimal(immoElement) : 0m;
                var biens = row.TryGetProperty("biens", out var biensElement) ? ParseDecimal(biensElement) : 0m;
                var total = row.TryGetProperty("totalDed", out var totalElement) ? ParseDecimal(totalElement) : (immo + biens);

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TVADeductible] ([id_designiation_encaissement], [id_periode], [Immo], [BienService], [TVA])
SELECT [id], {periodeId}, {immo}, {biens}, {total}
FROM [dbo].[TVADeductible_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "tva_a_payer")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVAPayer] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var collectee = row.TryGetProperty("collectee", out var collecteeElement) ? ParseDecimal(collecteeElement) : 0m;
                var immo = row.TryGetProperty("immo", out var immoElement) ? ParseDecimal(immoElement) : 0m;
                var biens = row.TryGetProperty("biens", out var biensElement) ? ParseDecimal(biensElement) : 0m;
                var totalDed = row.TryGetProperty("totalDed", out var totalDedElement) ? ParseDecimal(totalDedElement) : (immo + biens);
                var payer = row.TryGetProperty("payer", out var payerElement) ? ParseDecimal(payerElement) : (collectee - totalDed);

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TVAPayer] ([id_designiation_encaissement], [id_periode], [TVACollecte], [TVAImmo], [TVABienService], [TVADeductible], [TVA])
SELECT [id], {periodeId}, {collectee}, {immo}, {biens}, {totalDed}, {payer}
FROM [dbo].[TVAPayer_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "droits_timbre")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TimbreRecap] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var caHt = row.TryGetProperty("caHt", out var caHtElement) ? ParseDecimal(caHtElement) : 0m;
                var montant = row.TryGetProperty("montant", out var montantElement) ? ParseDecimal(montantElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TimbreRecap] ([id_designiation_encaissement], [id_periode], [CAHT], [DroitTimbre])
SELECT [id], {periodeId}, {caHt}, {montant}
FROM [dbo].[TimbreRecap_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "tap15")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TAPRecap] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var caHt = row.TryGetProperty("caHt", out var caHtElement) ? ParseDecimal(caHtElement) : 0m;
                var taxe = row.TryGetProperty("taxe", out var taxeElement) ? ParseDecimal(taxeElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TAPRecap] ([id_designiation_encaissement], [id_periode], [MontantHT], [MontantExonere], [TAP])
SELECT [id], {periodeId}, {caHt}, {0m}, {taxe}
FROM [dbo].[TAPRecap_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "tnfdal1")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TNFDAL] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var caHt = row.TryGetProperty("caHt", out var caHtElement) ? ParseDecimal(caHtElement) : 0m;
                var taxe = row.TryGetProperty("taxe", out var taxeElement) ? ParseDecimal(taxeElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TNFDAL] ([id_designiation_encaissement], [id_periode], [CAHT], [TNFDAL])
SELECT [id], {periodeId}, {caHt}, {taxe}
FROM [dbo].[TNFDAL1_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "tacp7")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TACP7] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var baseValue = row.TryGetProperty("base", out var baseElement) ? ParseDecimal(baseElement) : 0m;
                var taxe = row.TryGetProperty("taxe", out var taxeElement) ? ParseDecimal(taxeElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TACP7] ([id_designiation_encaissement], [id_periode], [MontantHT], [TACP])
SELECT [id], {periodeId}, {baseValue}, {taxe}
FROM [dbo].[TACP7_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "g50")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[G50] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var montant = row.TryGetProperty("montant", out var montantElement) ? ParseDecimal(montantElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[G50] ([id_designiation_encaissement], [id_periode], [Montant])
SELECT [id], {periodeId}, {montant}
FROM [dbo].[G50_lignes]
WHERE [designiation] = {designation}");
            }

            return;
        }

        if (normalizedKey == "masters15")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[MasterRecap] WHERE [id_periode] = {periodeId}");
            foreach (var row in rows.EnumerateArray())
            {
                var designation = row.TryGetProperty("designation", out var d) ? d.ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(designation)) continue;
                var montant = row.TryGetProperty("base", out var montantElement) ? ParseDecimal(montantElement) : 0m;
                var taxe = row.TryGetProperty("taxe", out var taxeElement) ? ParseDecimal(taxeElement) : 0m;

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[MasterRecap] ([id_designiation_encaissement], [id_periode], [Montant], [Taxe15])
SELECT [id], {periodeId}, {montant}, {taxe}
FROM [dbo].[MasterRecap_lignes]
WHERE [designiation] = {designation}");
            }
        }
    }

    private async Task DeleteRecapRowsAsync(string key, int periodeId)
    {
        var normalizedKey = NormalizeRecapKey(key);

        if (normalizedKey == "tva_collectee")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVACollecte] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "tva_situation")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVADeductible] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "tva_a_payer")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TVAPayer] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "droits_timbre")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TimbreRecap] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "tap15")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TAPRecap] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "tnfdal1")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TNFDAL] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "tacp7")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TACP7] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "g50")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[G50] WHERE [id_periode] = {periodeId}");
            return;
        }

        if (normalizedKey == "masters15")
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[MasterRecap] WHERE [id_periode] = {periodeId}");
        }
    }

    private async Task<string> ExecuteRowsJsonQueryAsync(string sql, params SqlParameter[] parameters)
    {
        await using var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var parameter in parameters)
            command.Parameters.Add(parameter);

        var result = await command.ExecuteScalarAsync();
        return result?.ToString() ?? "[]";
    }

    private async Task<string> BuildRowsJsonFromDedicatedTablesAsync(string key, int? periodeId)
    {
        if (periodeId is null)
            return "[]";

        var normalizedKey = NormalizeRecapKey(key);

        if (normalizedKey == "tva_collectee")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[EncaissementTTC], 0) AS [ttc],
           ISNULL(r.[Exonere], 0) AS [exonere],
           ISNULL(r.[EncaissementHT], 0) AS [ht],
           ISNULL(r.[TVA], 0) AS [tva]
    FROM [dbo].[TVACollecte_lignes] l
    LEFT JOIN [dbo].[TVACollecte] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "tva_situation")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[Immo], 0) AS [immo],
           ISNULL(r.[BienService], 0) AS [biens],
           ISNULL(r.[TVA], 0) AS [totalDed]
    FROM [dbo].[TVADeductible_lignes] l
    LEFT JOIN [dbo].[TVADeductible] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "tva_a_payer")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[TVACollecte], 0) AS [collectee],
           ISNULL(r.[TVAImmo], 0) AS [immo],
           ISNULL(r.[TVABienService], 0) AS [biens],
           ISNULL(r.[TVADeductible], 0) AS [totalDed],
           ISNULL(r.[TVA], 0) AS [payer]
    FROM [dbo].[TVAPayer_lignes] l
    LEFT JOIN [dbo].[TVAPayer] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "droits_timbre")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[CAHT], 0) AS [caHt],
           ISNULL(r.[DroitTimbre], 0) AS [montant]
    FROM [dbo].[TimbreRecap_lignes] l
    LEFT JOIN [dbo].[TimbreRecap] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "tap15")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[MontantHT], 0) AS [caHt],
           ISNULL(r.[TAP], 0) AS [taxe]
    FROM [dbo].[TAPRecap_lignes] l
    LEFT JOIN [dbo].[TAPRecap] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "tnfdal1")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[CAHT], 0) AS [caHt],
           ISNULL(r.[TNFDAL], 0) AS [taxe]
    FROM [dbo].[TNFDAL1_lignes] l
    LEFT JOIN [dbo].[TNFDAL] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "tacp7")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[MontantHT], 0) AS [base],
           ISNULL(r.[TACP], 0) AS [taxe]
    FROM [dbo].[TACP7_lignes] l
    LEFT JOIN [dbo].[TACP7] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "g50")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[Montant], 0) AS [montant]
    FROM [dbo].[G50_lignes] l
    LEFT JOIN [dbo].[G50] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        if (normalizedKey == "masters15")
        {
            return await ExecuteRowsJsonQueryAsync(@"
SELECT (
    SELECT l.[designiation] AS [designation],
           ISNULL(r.[Montant], 0) AS [base],
           ISNULL(r.[Taxe15], 0) AS [taxe]
    FROM [dbo].[MasterRecap_lignes] l
    LEFT JOIN [dbo].[MasterRecap] r
      ON r.[id_designiation_encaissement] = l.[id]
     AND r.[id_periode] = @periodeId
    ORDER BY l.[id]
    FOR JSON PATH
)", new SqlParameter("@periodeId", periodeId.Value));
        }

        return "[]";
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? key, [FromQuery] string? mois, [FromQuery] string? annee)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized();

        var role = await GetCurrentUserRoleAsync(userId);

        IQueryable<Recap> query = _context.Recaps.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(key))
            query = query.Where(r => r.Key == key.Trim());

        if (!string.IsNullOrWhiteSpace(mois))
            query = query.Where(r => r.Mois == mois.Trim());

        if (!string.IsNullOrWhiteSpace(annee))
            query = query.Where(r => r.Annee == annee.Trim());

        if (role == "regionale" || role == "direction")
        {
            query = query.Where(r => r.UserId == userId);
        }

        var infos = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var recaps = new List<object>();
        foreach (var recap in infos)
        {
            var periodeId = await GetPeriodeIdAsync(recap.Mois, recap.Annee);
            var rowsJson = await BuildRowsJsonFromDedicatedTablesAsync(recap.Key, periodeId);

            recaps.Add(new
            {
                recap.Id,
                recap.Key,
                recap.Title,
                recap.Mois,
                recap.Annee,
                RowsJson = rowsJson,
                recap.FormulasJson,
                recap.IsGenerated,
                recap.CreatedAt,
                recap.UpdatedAt,
                recap.UserId
            });
        }

        return Ok(recaps);
    }

    [HttpPost("save")]
    public async Task<IActionResult> Save([FromBody] EtatsDeSortieSaveRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Key)
            || string.IsNullOrWhiteSpace(request.Title)
            || string.IsNullOrWhiteSpace(request.Mois)
            || string.IsNullOrWhiteSpace(request.Annee))
        {
            return BadRequest(new { message = "Les champs key, title, mois et annee sont obligatoires." });
        }

        if (request.Rows.ValueKind != JsonValueKind.Array)
        {
            return BadRequest(new { message = "Le champ rows doit être un tableau JSON." });
        }

        var now = DateTime.UtcNow;
        var requestedDirection = (request.Direction ?? string.Empty).Trim();
        var formulasJson = request.Formulas.ValueKind == JsonValueKind.Undefined
            ? "{}"
            : request.Formulas.GetRawText();

        var normalizedKey = request.Key.Trim();
        var normalizedMois = request.Mois.Trim();
        var normalizedAnnee = request.Annee.Trim();

        var periode = await GetOrCreatePeriodeAsync(normalizedMois, normalizedAnnee);

        var existing = await _context.Recaps
            .FirstOrDefaultAsync(r => r.Key == normalizedKey
                && r.Mois == normalizedMois
                && r.Annee == normalizedAnnee
                && r.Direction == requestedDirection);
        var isCreate = existing is null;

        if (existing is null)
        {
            existing = new Recap
            {
                Key = normalizedKey,
                Title = request.Title.Trim(),
                Mois = normalizedMois,
                Annee = normalizedAnnee,
                Direction = requestedDirection,
                FormulasJson = formulasJson,
                IsGenerated = request.IsGenerated,
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.Recaps.Add(existing);
        }
        else
        {
            existing.Title = request.Title.Trim();
            existing.FormulasJson = formulasJson;
            existing.IsGenerated = request.IsGenerated;
            existing.UserId = userId;
            existing.UpdatedAt = now;

        }

        await _context.SaveChangesAsync();

        await PersistRecapRowsAsync(normalizedKey, periode.Id, request.Rows);

        var rowsJson = await BuildRowsJsonFromDedicatedTablesAsync(normalizedKey, periode.Id);

        await _auditService.LogAction(userId, "ETATS_SORTIE_SAVE", "EtatsDeSortie", existing.Id,
            new
            {
                existing.Key,
                existing.Title,
                existing.Mois,
                existing.Annee,
                existing.Direction,
                existing.IsGenerated,
                action = isCreate ? "create" : "update"
            });

        return Ok(new
        {
            existing.Id,
            existing.Key,
            existing.Title,
            existing.Mois,
            existing.Annee,
            RowsJson = rowsJson,
            existing.FormulasJson,
            existing.IsGenerated,
            existing.CreatedAt,
            existing.UpdatedAt,
            existing.UserId
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized();

        var recap = await _context.Recaps.FirstOrDefaultAsync(r => r.Id == id);
        if (recap is null) return NotFound(new { message = "Recap introuvable." });

        var role = await GetCurrentUserRoleAsync(userId);

        var canDelete = role == "admin"
            || recap.UserId == userId
            || (role is "finance" or "comptabilite");

        if (!canDelete)
            return Forbid();

        var periodeId = await GetPeriodeIdAsync(recap.Mois, recap.Annee);
        if (periodeId is not null)
            await DeleteRecapRowsAsync(recap.Key, periodeId.Value);

        _context.Recaps.Remove(recap);
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "ETATS_SORTIE_DELETE", "EtatsDeSortie", recap.Id,
            new { recap.Key, recap.Mois, recap.Annee });

        return Ok(new { message = "Recap supprimé." });
    }

    [HttpPost("{id:int}/print")]
    public async Task<IActionResult> LogPrint(int id)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized();

        var recap = await _context.Recaps
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recap is null) return NotFound(new { message = "Recap introuvable." });

        var role = await GetCurrentUserRoleAsync(userId);
        var canPrint = role == "admin"
            || role == "finance"
            || role == "comptabilite"
            || recap.UserId == userId;

        if (!canPrint)
            return Forbid();

        await _auditService.LogAction(userId, "ETATS_SORTIE_PRINT", "EtatsDeSortie", recap.Id,
            new { recap.Key, recap.Mois, recap.Annee });

        return Ok(new { message = "Impression enregistrée dans l'audit." });
    }
}

public class EtatsDeSortieSaveRequest
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Mois { get; set; } = string.Empty;
    public string Annee { get; set; } = string.Empty;
    public string? Direction { get; set; }
    public JsonElement Rows { get; set; }
    public JsonElement Formulas { get; set; }
    public bool IsGenerated { get; set; } = true;
}
