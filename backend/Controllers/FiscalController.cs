using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.RealTime;
using CheckFillingAPI.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using System.Globalization;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FiscalController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IHubContext<CheckUpdatesHub> _hubContext;

    public FiscalController(AppDbContext context, IAuditService auditService, IHubContext<CheckUpdatesHub> hubContext)
    {
        _context = context;
        _auditService = auditService;
        _hubContext = hubContext;
    }

    private sealed class DeclarationView
    {
        public int Id { get; init; }
        public string TabKey { get; init; } = string.Empty;
        public string SupplierScopeKey { get; init; } = string.Empty;
        public string Mois { get; init; } = string.Empty;
        public string Annee { get; init; } = string.Empty;
        public string Direction { get; init; } = string.Empty;
        public string Statut { get; init; } = "PENDING";
        public DateTime SubmittedAt { get; init; }
    }

    private async Task NotifyFiscalDeclarationChangedAsync(string action, FiscalDeclarationHeader declaration, FiscalPeriode periode, int changedByUserId)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("fiscalDeclarationChanged", new
            {
                action,
                declarationId = declaration.Id,
                tabKey = declaration.TableauCode,
                mois = periode.Mois.ToString("00"),
                annee = periode.Annee.ToString(),
                declaration.Direction,
                isApproved = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase),
                approvedByUserId = (int?)null,
                approvedAt = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase) ? declaration.SubmittedAt : (DateTime?)null,
                updatedAt = declaration.SubmittedAt,
                changedByUserId,
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"SignalR fiscalDeclarationChanged failed: {ex.Message}");
        }
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    private async Task<(string Role, string Direction, string Region)> GetCurrentUserContextAsync(int userId)
    {
        var userFromDatabase = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Role, u.Direction, u.Region })
            .FirstOrDefaultAsync();

        var roleClaim = User.FindFirst("role")?.Value
            ?? User.FindFirst(ClaimTypes.Role)?.Value
            ?? "";

        var normalizedRole = !string.IsNullOrWhiteSpace(userFromDatabase?.Role)
            ? userFromDatabase!.Role.Trim().ToLowerInvariant()
            : roleClaim.Trim().ToLowerInvariant();

        var canonicalRole = CanonicalizeRole(normalizedRole);

        return (
            canonicalRole,
            (userFromDatabase?.Direction ?? "").Trim(),
            (userFromDatabase?.Region ?? "").Trim()
        );
    }

    private static string CanonicalizeRole(string? role)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();

        if (normalizedRole is "admin" or "administrateur" or "administrator")
            return "admin";

        if (normalizedRole is "regionale" or "régionale" or "regional" or "region")
            return "regionale";

        if (normalizedRole is "comptabilite" or "comptabilité" or "finance" or "direction")
            return "finance";

        return normalizedRole;
    }

    private static int GetDeadlineDayForRole(string? role)
    {
        _ = role;
        return 10;
    }

    private static string ResolveDirectionForRole(string role, string? requestedDirection, string userDirection, string userRegion, string? existingDirection = null)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();
        var normalizedRequestedDirection = (requestedDirection ?? "").Trim();
        var normalizedUserDirection = (userDirection ?? "").Trim();
        var normalizedUserRegion = (userRegion ?? "").Trim();
        var normalizedExistingDirection = (existingDirection ?? "").Trim();

        if (normalizedRole == "admin")
        {
            if (!string.IsNullOrWhiteSpace(normalizedRequestedDirection))
                return normalizedRequestedDirection;
            if (!string.IsNullOrWhiteSpace(normalizedExistingDirection))
                return normalizedExistingDirection;
            return normalizedUserDirection;
        }

        if (normalizedRole is "comptabilite" or "finance")
            return "Siège";

        if (normalizedRole == "regionale")
        {
            if (!string.IsNullOrWhiteSpace(normalizedUserRegion))
                return normalizedUserRegion;
            if (!string.IsNullOrWhiteSpace(normalizedUserDirection))
                return normalizedUserDirection;
        }

        if (!string.IsNullOrWhiteSpace(normalizedRequestedDirection))
            return normalizedRequestedDirection;
        if (!string.IsNullOrWhiteSpace(normalizedExistingDirection))
            return normalizedExistingDirection;
        return normalizedUserDirection;
    }

    private static bool TryBuildPeriodDeadline(string mois, string annee, string? role, out DateTime deadline)
    {
        deadline = DateTime.MinValue;

        if (!int.TryParse((mois ?? "").Trim(), out var month) || month < 1 || month > 12)
            return false;

        if (!int.TryParse((annee ?? "").Trim(), out var year) || year < 1900 || year > 9999)
            return false;

        var deadlineMonth = month == 12 ? 1 : month + 1;
        var deadlineYear = month == 12 ? year + 1 : year;
        var deadlineDay = GetDeadlineDayForRole(role);

        deadline = new DateTime(deadlineYear, deadlineMonth, deadlineDay, 23, 59, 59, DateTimeKind.Local);
        return true;
    }

    private static bool IsPeriodLocked(string mois, string annee, string? role, out DateTime deadline)
    {
        if (!TryBuildPeriodDeadline(mois, annee, role, out deadline))
            return false;

        return DateTime.Now > deadline;
    }

    private IActionResult BuildPeriodLockedResponse(string mois, string annee, DateTime deadline)
    {
        return Conflict(new
        {
            message = $"La période {mois}/{annee} est clôturée. Le délai était fixé au {deadline:dd/MM/yyyy HH:mm}."
        });
    }

    private static readonly string[] RegionalManageableTabOrder =
    {
        "encaissement",
        "tva_immo",
        "tva_biens",
        "droits_timbre",
        "ca_tap",
        "etat_tap"
    };

    private static readonly string[] FinanceManageableTabOrder =
    {
        "tva_immo",
        "tva_biens",
        "ca_siege",
        "irg",
        "taxe2",
        "taxe_masters",
        "taxe_vehicule",
        "taxe_formation",
        "acompte",
        "ibs",
        "taxe_domicil",
        "tva_autoliq"
    };

    private static readonly HashSet<string> RegionalManageableTabs = new(RegionalManageableTabOrder, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> FinanceManageableTabs = new(FinanceManageableTabOrder, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> AcompteAllowedMonths = new(new[] { "03", "05", "10" }, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> SupplierScopedTabs = new(new[] { "ibs", "tva_autoliq" }, StringComparer.OrdinalIgnoreCase);

    private static string NormalizeTabKey(string? tabKey) => (tabKey ?? "").Trim().ToLowerInvariant();

    private static bool IsSupplierScopedTab(string? tabKey)
    {
        return SupplierScopedTabs.Contains(NormalizeTabKey(tabKey));
    }

    private static string ExtractSupplierScopeKey(string? tabKey, string? dataJson)
    {
        var normalizedTabKey = NormalizeTabKey(tabKey);
        if (!IsSupplierScopedTab(normalizedTabKey))
            return string.Empty;

        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(dataJson) ? "{}" : dataJson);
            var root = document.RootElement;

            if (normalizedTabKey == "ibs"
                && root.TryGetProperty("ibsFournisseurId", out var ibsFournisseurIdProperty)
                && ibsFournisseurIdProperty.ValueKind is JsonValueKind.String or JsonValueKind.Number)
            {
                return ibsFournisseurIdProperty.ToString().Trim();
            }

            if (normalizedTabKey == "tva_autoliq"
                && root.TryGetProperty("tva16FournisseurId", out var tva16FournisseurIdProperty)
                && tva16FournisseurIdProperty.ValueKind is JsonValueKind.String or JsonValueKind.Number)
            {
                return tva16FournisseurIdProperty.ToString().Trim();
            }
        }
        catch
        {
            return string.Empty;
        }

        return string.Empty;
    }

    private static bool IsAcompteAllowedForMonth(string? month)
    {
        var normalizedMonth = (month ?? string.Empty).Trim();
        return AcompteAllowedMonths.Contains(normalizedMonth);
    }

    private async Task<bool> IsTable6EnabledAsync()
    {
        var latestUpdate = await _context.AuditLogs
            .AsNoTracking()
            .Where(l => l.Action == "UPDATE_FISCAL_SETTING" && l.EntityType == "FiscalSetting")
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestUpdate is null)
            return true;

        try
        {
            using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(latestUpdate.Details) ? "{}" : latestUpdate.Details);
            var root = document.RootElement;

            if (root.TryGetProperty("isTable6Enabled", out var isEnabledElement)
                && isEnabledElement.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                return isEnabledElement.GetBoolean();
            }

            if (root.TryGetProperty("newValue", out var newValueElement))
            {
                if (newValueElement.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    return newValueElement.GetBoolean();

                if (newValueElement.ValueKind == JsonValueKind.String
                    && bool.TryParse(newValueElement.GetString(), out var parsedBool))
                {
                    return parsedBool;
                }
            }
        }
        catch
        {
            return true;
        }

        return true;
    }

    private static bool CanManageTabForRole(string role, string? tabKey)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();
        var normalizedTabKey = NormalizeTabKey(tabKey);

        if (string.IsNullOrWhiteSpace(normalizedTabKey)) return false;

        if (normalizedRole == "admin")
            return true;

        if (normalizedRole == "regionale")
            return RegionalManageableTabs.Contains(normalizedTabKey);

        if (normalizedRole is "comptabilite" or "finance" or "direction")
            return FinanceManageableTabs.Contains(normalizedTabKey);

        return false;
    }

    private static bool IsHeadOfficeDirection(string? direction)
    {
        var normalizedDirection = (direction ?? "").Trim().ToLowerInvariant();
        return normalizedDirection is "siege" or "siège"
            || normalizedDirection.Contains("siege")
            || normalizedDirection.Contains("siège");
    }

    private static string NormalizeDirectionKey(string? direction)
    {
        var normalizedDirection = (direction ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedDirection))
            return string.Empty;

        return IsHeadOfficeDirection(normalizedDirection) ? "siege" : normalizedDirection;
    }

    private static string[] GetManageableTabsForRole(string role)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();

        if (normalizedRole == "admin")
            return RegionalManageableTabOrder.Concat(FinanceManageableTabOrder).ToArray();

        if (normalizedRole == "regionale")
            return RegionalManageableTabOrder.ToArray();

        if (normalizedRole is "comptabilite" or "finance" or "direction")
            return FinanceManageableTabOrder.ToArray();

        return Array.Empty<string>();
    }

    private static string[] GetManageableTabsForRoleAndDirection(string role, string? direction)
    {
        var roleTabs = GetManageableTabsForRole(role);
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();

        if (normalizedRole != "admin" || string.IsNullOrWhiteSpace(direction))
            return roleTabs;

        var scoped = IsHeadOfficeDirection(direction) ? FinanceManageableTabOrder : RegionalManageableTabOrder;
        return roleTabs
            .Where(tab => scoped.Contains(tab, StringComparer.OrdinalIgnoreCase))
            .ToArray();
    }

    private IActionResult BuildTabAccessDeniedResponse(string role, string? tabKey)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();
        var roleLabel = normalizedRole switch
        {
            "admin" => "admin",
            "regionale" => "régionale",
            "comptabilite" => "finance",
            "finance" => "finance",
            _ => "inconnu"
        };

        return StatusCode(403, new
        {
            message = $"Le profil {roleLabel} n'est pas autorisé à gérer le tableau '{NormalizeTabKey(tabKey)}'."
        });
    }

    private static bool IsDirectionAccessible(string role, string userDirection, string userRegion, string declarationDirection)
    {
        var normalizedRole = (role ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedRole == "admin" || normalizedRole is "finance" or "comptabilite" or "direction")
            return true;

        if (normalizedRole == "regionale")
        {
            var expectedDirection = !string.IsNullOrWhiteSpace(userRegion) ? userRegion : userDirection;
            if (string.IsNullOrWhiteSpace(expectedDirection))
                return false;

            return string.Equals((declarationDirection ?? string.Empty).Trim(), expectedDirection.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        if (!string.IsNullOrWhiteSpace(userDirection))
            return string.Equals((declarationDirection ?? string.Empty).Trim(), userDirection.Trim(), StringComparison.OrdinalIgnoreCase);

        return false;
    }

    private async Task<FiscalPeriode> GetOrCreatePeriodeAsync(string mois, string annee)
    {
        var month = int.Parse(mois);
        var year = int.Parse(annee);

        var periode = await _context.Periodes.FirstOrDefaultAsync(p => p.Mois == month && p.Annee == year);
        if (periode != null)
            return periode;

        periode = new FiscalPeriode { Mois = month, Annee = year };
        _context.Periodes.Add(periode);
        await _context.SaveChangesAsync();
        return periode;
    }

    private static bool TryNormalizePeriod(string? mois, string? annee, out string normalizedMois, out string normalizedAnnee)
    {
        normalizedMois = string.Empty;
        normalizedAnnee = string.Empty;

        if (!int.TryParse((mois ?? string.Empty).Trim(), out var month) || month < 1 || month > 12)
            return false;

        if (!int.TryParse((annee ?? string.Empty).Trim(), out var year) || year < 1900 || year > 9999)
            return false;

        normalizedMois = month.ToString("00");
        normalizedAnnee = year.ToString();
        return true;
    }

    private IQueryable<DeclarationView> BuildDeclarationQuery()
    {
        return _context.FiscalDeclarationHeaders
            .AsNoTracking()
            .Include(d => d.Periode)
            .Select(d => new DeclarationView
            {
                Id = d.Id,
                TabKey = d.TableauCode,
                SupplierScopeKey = d.SupplierScopeKey,
                Mois = d.Periode.Mois.ToString(),
                Annee = d.Periode.Annee.ToString(),
                Direction = d.Direction,
                Statut = d.Statut,
                SubmittedAt = d.SubmittedAt,
            });
    }

    private static string NormalizePayloadJson(string? dataJson)
    {
        var trimmed = (dataJson ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? "{}" : trimmed;
    }

    private static string ToInvariantString(decimal? value, int decimals = 2)
    {
        if (!value.HasValue)
            return string.Empty;

        return Math.Round(value.Value, decimals).ToString($"F{decimals}", CultureInfo.InvariantCulture);
    }

    private static string ToDateString(DateTime? value)
    {
        return value.HasValue ? value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;
    }

    private static string MonthNumberToFrenchName(int? month)
    {
        return month switch
        {
            1 => "Janvier",
            2 => "Fevrier",
            3 => "Mars",
            4 => "Avril",
            5 => "Mai",
            6 => "Juin",
            7 => "Juillet",
            8 => "Aout",
            9 => "Septembre",
            10 => "Octobre",
            11 => "Novembre",
            12 => "Decembre",
            _ => string.Empty
        };
    }

    private async Task<Dictionary<int, string>> GetPayloadMapAsync(IEnumerable<int> declarationIds)
    {
        var ids = declarationIds.Distinct().ToHashSet();
        if (ids.Count == 0)
            return new Dictionary<int, string>();

        var declarations = await BuildDeclarationQuery()
            .Where(d => ids.Contains(d.Id))
            .ToListAsync();

        var payloadMap = new Dictionary<int, string>();
        foreach (var declaration in declarations)
        {
            payloadMap[declaration.Id] = await BuildDataJsonFromNormalizedAsync(declaration);
        }

        return payloadMap;
    }

    private async Task<string> BuildDataJsonFromNormalizedAsync(DeclarationView declaration)
    {
        var period = await _context.Periodes
            .AsNoTracking()
            .FirstAsync(p => p.Mois == int.Parse(declaration.Mois) && p.Annee == int.Parse(declaration.Annee));

        var periodeDbId = period.Id;
        var direction = declaration.Direction;
        var tabKey = NormalizeTabKey(declaration.TabKey);

        switch (tabKey)
        {
            case "encaissement":
            {
                var rows = await _context.Database.SqlQueryRaw<EncaissementPayloadRow>(@"
SELECT l.[Designation], e.[MontantHT]
FROM [dbo].[Encaissement] e
INNER JOIN [dbo].[EncaissementLigne] l ON l.[Id] = e.[EncaissementLigneId]
WHERE e.[PeriodeId] = {0} AND e.[Direction] = {1}
ORDER BY l.[Id], e.[Id]", periodeDbId, direction).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    encRows = rows.Select(r => new { designation = r.Designation, ht = ToInvariantString(r.MontantHT) }).ToArray()
                });
            }

            case "tva_immo":
            case "tva_biens":
            {
                var tvaType = tabKey == "tva_immo" ? "IMMO" : "BS";
                var rows = await _context.Database.SqlQueryRaw<TvaPayloadRow>(@"
SELECT
    f.[Id] AS [FournisseurId],
    f.[Nom] AS [NomRaisonSociale],
    ISNULL(f.[Adresse], N'') AS [Adresse],
    ISNULL(f.[NIF], N'') AS [Nif],
    ISNULL(f.[RC], N'') AS [NumRC],
    t.[NumFacture],
    t.[DateFacture],
    fac.[MontantHT],
    fac.[TVA]
FROM [dbo].[Tva] t
INNER JOIN [dbo].[Facture] fac
    ON fac.[IdFournisseur] = t.[IdFournisseur]
   AND fac.[NumFacture] = t.[NumFacture]
   AND fac.[DateFacture] = t.[DateFacture]
INNER JOIN [dbo].[Fournisseur] f ON f.[Id] = t.[IdFournisseur]
WHERE t.[PeriodeId] = {0} AND t.[Direction] = {1} AND t.[Type] = {2}
ORDER BY t.[Id]", periodeDbId, direction, tvaType).ToListAsync();

                var key = tabKey == "tva_immo" ? "tvaImmoRows" : "tvaBiensRows";
                var payloadRows = rows.Select(r => new
                {
                    fournisseurId = r.FournisseurId.ToString(CultureInfo.InvariantCulture),
                    nomRaisonSociale = r.NomRaisonSociale,
                    adresse = r.Adresse,
                    nif = r.Nif,
                    authNif = "",
                    numRC = r.NumRC,
                    authRC = "",
                    numFacture = r.NumFacture,
                    dateFacture = ToDateString(r.DateFacture),
                    montantHT = ToInvariantString(r.MontantHT),
                    tva = ToInvariantString(r.TVA)
                }).ToArray();

                return key == "tvaImmoRows"
                    ? JsonSerializer.Serialize(new { tvaImmoRows = payloadRows })
                    : JsonSerializer.Serialize(new { tvaBiensRows = payloadRows });
            }

            case "droits_timbre":
            {
                var rows = await _context.Database.SqlQueryRaw<TimbrePayloadRow>(@"
SELECT l.[Designation], t.[ChiffreAffaireTTC], t.[DroitTimbre]
FROM [dbo].[Timbre] t
INNER JOIN [dbo].[TimbreLigne] l ON l.[Id] = t.[TimbreLigneId]
WHERE t.[PeriodeId] = {0} AND t.[Direction] = {1}
ORDER BY l.[Id], t.[Id]", periodeDbId, direction).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    timbreRows = rows.Select(r => new
                    {
                        designation = r.Designation,
                        caTTCEsp = ToInvariantString(r.ChiffreAffaireTTC),
                        droitTimbre = ToInvariantString(r.DroitTimbre)
                    }).ToArray()
                });
            }

            case "ca_tap":
            {
                var lines = await _context.Database.SqlQueryRaw<CaTapPayloadRow>(@"
SELECT l.[Designation], c.[MontantCA]
FROM [dbo].[Ca71] c
INNER JOIN [dbo].[Ca71Ligne] l ON l.[Id] = c.[LigneId]
WHERE c.[PeriodeId] = {0} AND c.[Direction] = {1}
ORDER BY l.[Id]", periodeDbId, direction).ToListAsync();

                var b12 = lines.FirstOrDefault(x => string.Equals(x.Designation, "B12", StringComparison.OrdinalIgnoreCase))?.MontantCA;
                var b13 = lines.FirstOrDefault(x => string.Equals(x.Designation, "B13", StringComparison.OrdinalIgnoreCase))?.MontantCA;

                return JsonSerializer.Serialize(new { b12 = ToInvariantString(b12), b13 = ToInvariantString(b13) });
            }

            case "etat_tap":
            {
                var rows = await _context.Database.SqlQueryRaw<TapPayloadRow>(@"
SELECT w.[Code] AS [WilayaCode], c.[Code] AS [Commune], t.[MontantImposable]
FROM [dbo].[Tap] t
INNER JOIN [dbo].[Commune] c ON c.[Id] = t.[CommuneId]
INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId]
WHERE t.[PeriodeId] = {0} AND t.[Direction] = {1}
ORDER BY t.[Id]", periodeDbId, direction).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    tapRows = rows.Select(r => new
                    {
                        wilayaCode = r.WilayaCode,
                        commune = r.Commune,
                        tap2 = ToInvariantString(r.MontantImposable)
                    }).ToArray()
                });
            }

            case "ca_siege":
            {
                var rows = await _context.Database.SqlQueryRaw<CaSiegePayloadRow>(@"
SELECT [MontantTTC], [MontantHT]
FROM [dbo].[CaSiege]
WHERE [PeriodeId] = {0}
ORDER BY [LigneId], [Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    caSiegeRows = rows.Select(r => new
                    {
                        ttc = ToInvariantString(r.MontantTTC),
                        ht = ToInvariantString(r.MontantHT)
                    }).ToArray()
                });
            }

            case "irg":
            {
                var rows = await _context.Database.SqlQueryRaw<IrgPayloadRow>(@"
SELECT [AssietteImposable], [Montant]
FROM [dbo].[Irg]
WHERE [PeriodeId] = {0}
ORDER BY [LigneId], [Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    irgRows = rows.Select(r => new
                    {
                        assietteImposable = ToInvariantString(r.AssietteImposable),
                        montant = ToInvariantString(r.Montant)
                    }).ToArray()
                });
            }

            case "taxe2":
            {
                var rows = await _context.Database.SqlQueryRaw<Taxe2PayloadRow>(@"
SELECT [BaseMontant], [MontantTaxe]
FROM [dbo].[Taxe2]
WHERE [PeriodeId] = {0}
ORDER BY [Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    taxe2Rows = rows.Select(r => new
                    {
                        @base = ToInvariantString(r.BaseMontant),
                        montant = ToInvariantString(r.MontantTaxe)
                    }).ToArray()
                });
            }

            case "taxe_masters":
            {
                var rows = await _context.Database.SqlQueryRaw<TaxeMasterPayloadRow>(@"
SELECT [DateFacture], [Nom], [NumFacture], [MontantHT], [Taxe], [Mois], [Observation]
FROM [dbo].[TaxeMaster]
WHERE [PeriodeId] = {0}
ORDER BY [Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    masterRows = rows.Select(r => new
                    {
                        date = ToDateString(r.DateFacture),
                        nomMaster = r.Nom ?? string.Empty,
                        numFacture = r.NumFacture ?? string.Empty,
                        dateFacture = ToDateString(r.DateFacture),
                        montantHT = ToInvariantString(r.MontantHT),
                        taxe15 = ToInvariantString(r.Taxe),
                        mois = MonthNumberToFrenchName(r.Mois),
                        observation = r.Observation ?? string.Empty
                    }).ToArray()
                });
            }

            case "taxe_vehicule":
            {
                var montantRows = await _context.Database.SqlQueryRaw<TaxeVehiculePayloadRow>(@"
SELECT TOP 1 [Montant]
FROM [dbo].[TaxeVehicule]
WHERE [PeriodeId] = {0}
ORDER BY [Id]", periodeDbId).ToListAsync();

                var montant = montantRows.FirstOrDefault();

                return JsonSerializer.Serialize(new { taxe11Montant = ToInvariantString(montant?.Montant) });
            }

            case "taxe_formation":
            {
                var rows = await _context.Database.SqlQueryRaw<TaxeFormationPayloadRow>(@"
SELECT [Montant]
FROM [dbo].[Formation]
WHERE [PeriodeId] = {0}
ORDER BY [LigneId], [Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    taxe12Rows = rows.Select(r => new { montant = ToInvariantString(r.Montant) }).ToArray()
                });
            }

            case "acompte":
            {
                var months = Enumerable.Repeat(string.Empty, 12).ToArray();

                var rows = await _context.Database.SqlQueryRaw<AcomptePayloadRow>(@"
SELECT [MonthIndex], [Montant]
FROM [dbo].[AcompteProvisionel]
WHERE [PeriodeId] = {0}
ORDER BY [MonthIndex], [Id]", periodeDbId).ToListAsync();

                foreach (var row in rows)
                {
                    if (row.MonthIndex is >= 1 and <= 12)
                    {
                        months[row.MonthIndex.Value - 1] = ToInvariantString(row.Montant);
                    }
                }

                return JsonSerializer.Serialize(new { acompteMonths = months });
            }

            case "ibs":
            {
                var fournisseurId = int.TryParse(declaration.SupplierScopeKey, out var parsedSupplierId) ? parsedSupplierId : 0;
                var rows = await _context.Database.SqlQueryRaw<IbsPayloadRow>(@"
SELECT [NumFacture], [MontantBrutDevise], [MontantBrutDinars], [MontantNetTransferableDevise], [MontantIBS], [MontantNetTransferableDinars]
FROM [dbo].[Ibs]
WHERE [PeriodeId] = {0} AND [FournisseurId] = {1}
ORDER BY [Id]", periodeDbId, fournisseurId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    ibsFournisseurId = declaration.SupplierScopeKey,
                    ibs14Rows = rows.Select(r => new
                    {
                        numFacture = r.NumFacture ?? string.Empty,
                        montantBrutDevise = ToInvariantString(r.MontantBrutDevise, 5),
                        tauxChange = string.Empty,
                        montantBrutDinars = ToInvariantString(r.MontantBrutDinars),
                        montantNetDevise = ToInvariantString(r.MontantNetTransferableDevise, 5),
                        montantIBS = ToInvariantString(r.MontantIBS),
                        montantNetDinars = ToInvariantString(r.MontantNetTransferableDinars)
                    }).ToArray()
                });
            }

            case "taxe_domicil":
            {
                var rows = await _context.Database.SqlQueryRaw<DomiciliationPayloadRow>(@"
SELECT d.[NumFacture], d.[DateFacture], f.[Nom] AS [RaisonSociale], d.[MontantNetDevise], d.[Devise], d.[TauxChange], d.[MontantDinars], d.[TauxTaxe], d.[MontantAPayerDinars]
FROM [dbo].[Domiciliation] d
INNER JOIN [dbo].[Fournisseur] f ON f.[Id] = d.[FournisseurId]
WHERE d.[PeriodeId] = {0}
ORDER BY d.[Id]", periodeDbId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    taxe15Rows = rows.Select(r => new
                    {
                        numFacture = r.NumFacture ?? string.Empty,
                        dateFacture = ToDateString(r.DateFacture),
                        raisonSociale = r.RaisonSociale ?? string.Empty,
                        montantNetDevise = ToInvariantString(r.MontantNetDevise, 5),
                        monnaie = r.Devise ?? string.Empty,
                        tauxChange = ToInvariantString(r.TauxChange, 5),
                        montantDinars = ToInvariantString(r.MontantDinars),
                        tauxTaxe = ToInvariantString(r.TauxTaxe),
                        montantAPayer = ToInvariantString(r.MontantAPayerDinars)
                    }).ToArray()
                });
            }

            case "tva_autoliq":
            {
                var fournisseurId = int.TryParse(declaration.SupplierScopeKey, out var parsedSupplierId) ? parsedSupplierId : 0;
                var rows = await _context.Database.SqlQueryRaw<AutoLiquidationPayloadRow>(@"
SELECT [NumFacture], [MontantBrutDevise], [TauxChange], [MontantBrutDinars], [TVA19]
FROM [dbo].[AutoLiquidation]
WHERE [PeriodeId] = {0} AND [FournisseurId] = {1}
ORDER BY [Id]", periodeDbId, fournisseurId).ToListAsync();

                return JsonSerializer.Serialize(new
                {
                    tva16FournisseurId = declaration.SupplierScopeKey,
                    tva16Rows = rows.Select(r => new
                    {
                        numFacture = r.NumFacture ?? string.Empty,
                        montantBrutDevise = ToInvariantString(r.MontantBrutDevise, 5),
                        tauxChange = ToInvariantString(r.TauxChange, 5),
                        montantBrutDinars = ToInvariantString(r.MontantBrutDinars),
                        tva19 = ToInvariantString(r.TVA19)
                    }).ToArray()
                });
            }

            default:
                return "{}";
        }
    }

    private static string NormalizeDirectionValue(string? direction) => (direction ?? string.Empty).Trim();

    private async Task PersistNormalizedTabDataAsync(string tabKey, int periodeId, string direction, string? dataJson)
    {
        var normalizedTabKey = NormalizeTabKey(tabKey);
        var payload = NormalizePayloadJson(dataJson);
        var normalizedDirection = NormalizeDirectionValue(direction);

        switch (normalizedTabKey)
        {
            case "encaissement":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[EncaissementLigne] ([Designation])
SELECT DISTINCT j.[designation]
FROM OPENJSON({payload}, '$.encRows')
WITH ([designation] NVARCHAR(255) '$.designation') AS j
LEFT JOIN [dbo].[EncaissementLigne] l ON l.[Designation] = j.[designation]
WHERE j.[designation] IS NOT NULL AND LTRIM(RTRIM(j.[designation])) <> N'' AND l.[Id] IS NULL;

DELETE FROM [dbo].[Encaissement] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};

INSERT INTO [dbo].[Encaissement] ([EncaissementLigneId], [PeriodeId], [Direction], [MontantHT], [MontantTVA], [MontantTTC])
SELECT
    l.[Id],
    {periodeId},
    {normalizedDirection},
    TRY_CAST(j.[ht] AS DECIMAL(18,2)),
    TRY_CAST(j.[ht] AS DECIMAL(18,2)) * 0.19,
    TRY_CAST(j.[ht] AS DECIMAL(18,2)) * 1.19
FROM OPENJSON({payload}, '$.encRows')
WITH (
    [designation] NVARCHAR(255) '$.designation',
    [ht] NVARCHAR(64) '$.ht'
) AS j
INNER JOIN [dbo].[EncaissementLigne] l ON l.[Designation] = j.[designation];
");
                break;

            case "tva_immo":
            case "tva_biens":
            {
                var tvaType = normalizedTabKey == "tva_immo" ? "IMMO" : "BS";
                var rowsPath = normalizedTabKey == "tva_immo" ? "$.tvaImmoRows" : "$.tvaBiensRows";

                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[Fournisseur] ([Nom], [EstEtranger], [NIF], [RC], [Adresse])
SELECT DISTINCT
    NULLIF(LTRIM(RTRIM(j.[nomRaisonSociale])), N''),
    0,
    NULLIF(LTRIM(RTRIM(j.[nif])), N''),
    NULLIF(LTRIM(RTRIM(j.[numRC])), N''),
    NULLIF(LTRIM(RTRIM(j.[adresse])), N'')
FROM OPENJSON({payload}, {rowsPath})
WITH (
    [nomRaisonSociale] NVARCHAR(255) '$.nomRaisonSociale',
    [nif] NVARCHAR(50) '$.nif',
    [numRC] NVARCHAR(50) '$.numRC',
    [adresse] NVARCHAR(255) '$.adresse'
) AS j
WHERE NULLIF(LTRIM(RTRIM(j.[nomRaisonSociale])), N'') IS NOT NULL
  AND NOT EXISTS (
        SELECT 1
        FROM [dbo].[Fournisseur] f
        WHERE f.[Nom] = NULLIF(LTRIM(RTRIM(j.[nomRaisonSociale])), N'')
          AND ISNULL(f.[NIF], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[nif])), N''), N'')
          AND ISNULL(f.[Adresse], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[adresse])), N''), N'')
  );

DELETE t
FROM [dbo].[Tva] t
WHERE t.[PeriodeId] = {periodeId}
  AND t.[Direction] = {normalizedDirection}
  AND t.[Type] = {tvaType};

INSERT INTO [dbo].[Facture] ([IdFournisseur], [NumFacture], [DateFacture], [MontantHT], [TVA], [MontantTTC])
SELECT DISTINCT
    f.[Id],
    j.[numFacture],
    TRY_CAST(j.[dateFacture] AS DATE),
    TRY_CAST(j.[montantHT] AS DECIMAL(18,2)),
    TRY_CAST(j.[tva] AS DECIMAL(18,2)),
    TRY_CAST(j.[montantHT] AS DECIMAL(18,2)) + TRY_CAST(j.[tva] AS DECIMAL(18,2))
FROM OPENJSON({payload}, {rowsPath})
WITH (
    [nomRaisonSociale] NVARCHAR(255) '$.nomRaisonSociale',
    [nif] NVARCHAR(50) '$.nif',
    [adresse] NVARCHAR(255) '$.adresse',
    [numFacture] NVARCHAR(50) '$.numFacture',
    [dateFacture] NVARCHAR(50) '$.dateFacture',
    [montantHT] NVARCHAR(64) '$.montantHT',
    [tva] NVARCHAR(64) '$.tva'
) AS j
INNER JOIN [dbo].[Fournisseur] f
    ON f.[Nom] = NULLIF(LTRIM(RTRIM(j.[nomRaisonSociale])), N'')
   AND ISNULL(f.[NIF], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[nif])), N''), N'')
   AND ISNULL(f.[Adresse], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[adresse])), N''), N'')
WHERE NULLIF(LTRIM(RTRIM(j.[numFacture])), N'') IS NOT NULL
  AND TRY_CAST(j.[dateFacture] AS DATE) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[Facture] x
      WHERE x.[IdFournisseur] = f.[Id]
        AND x.[NumFacture] = j.[numFacture]
        AND x.[DateFacture] = TRY_CAST(j.[dateFacture] AS DATE)
  );

INSERT INTO [dbo].[Tva] ([IdFournisseur], [NumFacture], [DateFacture], [PeriodeId], [Direction], [Type])
SELECT
    f.[Id],
    j.[numFacture],
    TRY_CAST(j.[dateFacture] AS DATE),
    {periodeId},
    {normalizedDirection},
    {tvaType}
FROM OPENJSON({payload}, {rowsPath})
WITH (
    [nomRaisonSociale] NVARCHAR(255) '$.nomRaisonSociale',
    [nif] NVARCHAR(50) '$.nif',
    [adresse] NVARCHAR(255) '$.adresse',
    [numFacture] NVARCHAR(50) '$.numFacture',
    [dateFacture] NVARCHAR(50) '$.dateFacture'
) AS j
INNER JOIN [dbo].[Fournisseur] f
    ON f.[Nom] = NULLIF(LTRIM(RTRIM(j.[nomRaisonSociale])), N'')
   AND ISNULL(f.[NIF], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[nif])), N''), N'')
   AND ISNULL(f.[Adresse], N'') = ISNULL(NULLIF(LTRIM(RTRIM(j.[adresse])), N''), N'')
WHERE NULLIF(LTRIM(RTRIM(j.[numFacture])), N'') IS NOT NULL
  AND TRY_CAST(j.[dateFacture] AS DATE) IS NOT NULL;
");
                break;
            }

            case "ca_tap":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
IF NOT EXISTS (SELECT 1 FROM [dbo].[Ca71Ligne] WHERE [Designation] = N'B12')
    INSERT INTO [dbo].[Ca71Ligne] ([Designation]) VALUES (N'B12');
IF NOT EXISTS (SELECT 1 FROM [dbo].[Ca71Ligne] WHERE [Designation] = N'B13')
    INSERT INTO [dbo].[Ca71Ligne] ([Designation]) VALUES (N'B13');

DELETE FROM [dbo].[Ca71] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};

INSERT INTO [dbo].[Ca71] ([LigneId], [PeriodeId], [Direction], [MontantCA], [MontantTaxe])
SELECT [Id], {periodeId}, {normalizedDirection}, TRY_CAST(JSON_VALUE({payload}, '$.b12') AS DECIMAL(18,2)), TRY_CAST(JSON_VALUE({payload}, '$.b12') AS DECIMAL(18,2)) * 0.07
FROM [dbo].[Ca71Ligne] WHERE [Designation] = N'B12'
UNION ALL
SELECT [Id], {periodeId}, {normalizedDirection}, TRY_CAST(JSON_VALUE({payload}, '$.b13') AS DECIMAL(18,2)), TRY_CAST(JSON_VALUE({payload}, '$.b13') AS DECIMAL(18,2)) * 0.01
FROM [dbo].[Ca71Ligne] WHERE [Designation] = N'B13';
");
                break;

            case "etat_tap":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[Tap] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};

INSERT INTO [dbo].[Tap] ([PeriodeId], [Direction], [CommuneId], [MontantImposable], [MontantTAP])
SELECT
    {periodeId},
    {normalizedDirection},
    c.[Id],
    TRY_CAST(j.[tap2] AS DECIMAL(18,2)),
    TRY_CAST(j.[tap2] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.tapRows')
WITH (
    [wilayaCode] NVARCHAR(100) '$.wilayaCode',
    [commune] NVARCHAR(100) '$.commune',
    [tap2] NVARCHAR(64) '$.tap2'
) AS j
INNER JOIN [dbo].[Wilaya] w ON w.[Code] = j.[wilayaCode]
INNER JOIN [dbo].[Commune] c ON c.[Code] = j.[commune] AND c.[WilayaId] = w.[Id];
");
                break;

            case "droits_timbre":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[TimbreLigne] ([Designation])
SELECT DISTINCT j.[designation]
FROM OPENJSON({payload}, '$.timbreRows')
WITH ([designation] NVARCHAR(255) '$.designation') AS j
LEFT JOIN [dbo].[TimbreLigne] l ON l.[Designation] = j.[designation]
WHERE NULLIF(LTRIM(RTRIM(j.[designation])), N'') IS NOT NULL AND l.[Id] IS NULL;

DELETE FROM [dbo].[Timbre] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};

INSERT INTO [dbo].[Timbre] ([TimbreLigneId], [PeriodeId], [Direction], [ChiffreAffaireTTC], [DroitTimbre])
SELECT
    l.[Id],
    {periodeId},
    {normalizedDirection},
    TRY_CAST(j.[caTTCEsp] AS DECIMAL(18,2)),
    TRY_CAST(j.[droitTimbre] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.timbreRows')
WITH (
    [designation] NVARCHAR(255) '$.designation',
    [caTTCEsp] NVARCHAR(64) '$.caTTCEsp',
    [droitTimbre] NVARCHAR(64) '$.droitTimbre'
) AS j
INNER JOIN [dbo].[TimbreLigne] l ON l.[Designation] = j.[designation];
");
                break;

            case "ca_siege":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[CaSiegeLigne] ([Designation])
SELECT x.[Designation]
FROM (VALUES
    (N'Encaissement'),
    (N'Encaissement Exoneree'),
    (N'Encaissement MOBIPOST'),
    (N'Encaissement POST PAID'),
    (N'Encaissement RACIMO'),
    (N'Encaissement DME'),
    (N'Encaissement SOFIA'),
    (N'Encaissement CCP RECOUVREMENT A'),
    (N'Encaissement CCP RECOUVREMENT B'),
    (N'Encaissement CCP TPE'),
    (N'Encaissement BNA TPE'),
    (N'Encaissement MASTER ALGERIE POSTE')
) AS x([Designation])
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[CaSiegeLigne] l WHERE l.[Designation] = x.[Designation]);

DELETE FROM [dbo].[CaSiege] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[CaSiege] ([LigneId], [PeriodeId], [MontantHT], [MontantTTC])
SELECT l.[Id], {periodeId}, TRY_CAST(JSON_VALUE(j.[value], '$.ht') AS DECIMAL(18,2)), TRY_CAST(JSON_VALUE(j.[value], '$.ttc') AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.caSiegeRows') AS j
INNER JOIN [dbo].[CaSiegeLigne] l ON l.[Id] = (TRY_CAST(j.[key] AS INT) + 1);
");
                break;

            case "irg":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[IrgLigne] ([Designation])
SELECT x.[Designation]
FROM (VALUES
    (N'IRG sur Salaire Bareme'),
    (N'Autre IRG 10%'),
    (N'Autre IRG 15%'),
    (N'Jetons de presence 10%'),
    (N'Tantieme 10%')
) AS x([Designation])
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[IrgLigne] l WHERE l.[Designation] = x.[Designation]);

DELETE FROM [dbo].[Irg] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[Irg] ([LigneId], [PeriodeId], [AssietteImposable], [Montant])
SELECT l.[Id], {periodeId}, TRY_CAST(JSON_VALUE(j.[value], '$.assietteImposable') AS DECIMAL(18,2)), TRY_CAST(JSON_VALUE(j.[value], '$.montant') AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.irgRows') AS j
INNER JOIN [dbo].[IrgLigne] l ON l.[Id] = (TRY_CAST(j.[key] AS INT) + 1);
");
                break;

            case "taxe2":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[Taxe2] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[Taxe2] ([PeriodeId], [BaseMontant], [MontantTaxe])
SELECT {periodeId}, TRY_CAST(j.[base] AS DECIMAL(18,2)), TRY_CAST(j.[montant] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.taxe2Rows')
WITH (
    [base] NVARCHAR(64) '$.base',
    [montant] NVARCHAR(64) '$.montant'
) AS j;
");
                break;

            case "taxe_masters":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[TaxeMaster] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[TaxeMaster] ([PeriodeId], [DateFacture], [Nom], [NumFacture], [MontantHT], [Taxe], [Mois], [Observation])
SELECT
    {periodeId},
    TRY_CAST(j.[dateFacture] AS DATE),
    NULLIF(LTRIM(RTRIM(j.[nomMaster])), N''),
    NULLIF(LTRIM(RTRIM(j.[numFacture])), N''),
    TRY_CAST(j.[montantHT] AS DECIMAL(18,2)),
    TRY_CAST(j.[taxe15] AS DECIMAL(18,2)),
    CASE UPPER(LTRIM(RTRIM(j.[mois])))
        WHEN N'JANVIER' THEN 1
        WHEN N'FEVRIER' THEN 2
        WHEN N'MARS' THEN 3
        WHEN N'AVRIL' THEN 4
        WHEN N'MAI' THEN 5
        WHEN N'JUIN' THEN 6
        WHEN N'JUILLET' THEN 7
        WHEN N'AOUT' THEN 8
        WHEN N'SEPTEMBRE' THEN 9
        WHEN N'OCTOBRE' THEN 10
        WHEN N'NOVEMBRE' THEN 11
        WHEN N'DECEMBRE' THEN 12
        ELSE TRY_CAST(j.[mois] AS INT)
    END,
    NULLIF(LTRIM(RTRIM(j.[observation])), N'')
FROM OPENJSON({payload}, '$.masterRows')
WITH (
    [dateFacture] NVARCHAR(50) '$.dateFacture',
    [nomMaster] NVARCHAR(255) '$.nomMaster',
    [numFacture] NVARCHAR(50) '$.numFacture',
    [montantHT] NVARCHAR(64) '$.montantHT',
    [taxe15] NVARCHAR(64) '$.taxe15',
    [mois] NVARCHAR(10) '$.mois',
    [observation] NVARCHAR(255) '$.observation'
) AS j;
");
                break;

            case "taxe_vehicule":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[TaxeVehicule] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[TaxeVehicule] ([PeriodeId], [Montant])
VALUES ({periodeId}, TRY_CAST(JSON_VALUE({payload}, '$.taxe11Montant') AS DECIMAL(18,2)));
");
                break;

            case "taxe_formation":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[FormationLigne] ([Designation])
SELECT x.[Designation]
FROM (VALUES
    (N'Taxe de Formation Professionnelle 1%'),
    (N'Taxe d''Apprentissage 1%')
) AS x([Designation])
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[FormationLigne] l WHERE l.[Designation] = x.[Designation]);

DELETE FROM [dbo].[Formation] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[Formation] ([LigneId], [PeriodeId], [Montant])
SELECT l.[Id], {periodeId}, TRY_CAST(JSON_VALUE(j.[value], '$.montant') AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.taxe12Rows') AS j
INNER JOIN [dbo].[FormationLigne] l ON l.[Id] = (TRY_CAST(j.[key] AS INT) + 1);
");
                break;

            case "acompte":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[AcompteProvisionel] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[AcompteProvisionel] ([PeriodeId], [MonthIndex], [Montant])
SELECT {periodeId}, (TRY_CAST(j.[key] AS INT) + 1), TRY_CAST(j.[value] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.acompteMonths') AS j
WHERE NULLIF(LTRIM(RTRIM(j.[value])), N'') IS NOT NULL;
");
                break;

            case "ibs":
            {
                var supplierId = int.TryParse(ExtractSupplierScopeKey("ibs", payload), out var parsedSupplierId) ? parsedSupplierId : 0;
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[Ibs] WHERE [PeriodeId] = {periodeId} AND [FournisseurId] = {supplierId};

IF {supplierId} > 0
BEGIN
INSERT INTO [dbo].[Ibs] ([PeriodeId], [FournisseurId], [NumFacture], [MontantBrutDevise], [MontantBrutDinars], [MontantNetTransferableDevise], [MontantIBS], [MontantNetTransferableDinars])
SELECT
    {periodeId},
    {supplierId},
    NULLIF(LTRIM(RTRIM(j.[numFacture])), N''),
    TRY_CAST(j.[montantBrutDevise] AS DECIMAL(18,5)),
    TRY_CAST(j.[montantBrutDinars] AS DECIMAL(18,2)),
    TRY_CAST(j.[montantNetDevise] AS DECIMAL(18,5)),
    TRY_CAST(j.[montantIBS] AS DECIMAL(18,2)),
    TRY_CAST(j.[montantNetDinars] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.ibs14Rows')
WITH (
    [numFacture] NVARCHAR(50) '$.numFacture',
    [montantBrutDevise] NVARCHAR(64) '$.montantBrutDevise',
    [montantBrutDinars] NVARCHAR(64) '$.montantBrutDinars',
    [montantNetDevise] NVARCHAR(64) '$.montantNetDevise',
    [montantIBS] NVARCHAR(64) '$.montantIBS',
    [montantNetDinars] NVARCHAR(64) '$.montantNetDinars'
) AS j;
END
");
                break;
            }

            case "taxe_domicil":
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[Fournisseur] ([Nom], [EstEtranger], [NIF], [RC], [Adresse])
SELECT DISTINCT NULLIF(LTRIM(RTRIM(j.[raisonSociale])), N''), 1, NULL, NULL, NULL
FROM OPENJSON({payload}, '$.taxe15Rows')
WITH ([raisonSociale] NVARCHAR(255) '$.raisonSociale') AS j
WHERE NULLIF(LTRIM(RTRIM(j.[raisonSociale])), N'') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM [dbo].[Fournisseur] f
      WHERE f.[Nom] = NULLIF(LTRIM(RTRIM(j.[raisonSociale])), N'')
  );

DELETE FROM [dbo].[Domiciliation] WHERE [PeriodeId] = {periodeId};

INSERT INTO [dbo].[Domiciliation] ([PeriodeId], [FournisseurId], [NumFacture], [DateFacture], [MontantNetDevise], [Devise], [TauxChange], [MontantDinars], [TauxTaxe], [MontantAPayerDinars])
SELECT
    {periodeId},
    f.[Id],
    NULLIF(LTRIM(RTRIM(j.[numFacture])), N''),
    TRY_CAST(j.[dateFacture] AS DATE),
    TRY_CAST(j.[montantNetDevise] AS DECIMAL(18,5)),
    NULLIF(LTRIM(RTRIM(j.[monnaie])), N''),
    TRY_CAST(j.[tauxChange] AS DECIMAL(18,5)),
    TRY_CAST(j.[montantDinars] AS DECIMAL(18,2)),
    TRY_CAST(j.[tauxTaxe] AS DECIMAL(5,2)),
    TRY_CAST(j.[montantAPayer] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.taxe15Rows')
WITH (
    [numFacture] NVARCHAR(50) '$.numFacture',
    [dateFacture] NVARCHAR(50) '$.dateFacture',
    [raisonSociale] NVARCHAR(255) '$.raisonSociale',
    [montantNetDevise] NVARCHAR(64) '$.montantNetDevise',
    [monnaie] NVARCHAR(10) '$.monnaie',
    [tauxChange] NVARCHAR(64) '$.tauxChange',
    [montantDinars] NVARCHAR(64) '$.montantDinars',
    [tauxTaxe] NVARCHAR(64) '$.tauxTaxe',
    [montantAPayer] NVARCHAR(64) '$.montantAPayer'
) AS j
INNER JOIN [dbo].[Fournisseur] f
    ON f.[Nom] = NULLIF(LTRIM(RTRIM(j.[raisonSociale])), N'');
");
                break;

            case "tva_autoliq":
            {
                var supplierId = int.TryParse(ExtractSupplierScopeKey("tva_autoliq", payload), out var parsedSupplierId) ? parsedSupplierId : 0;
                await _context.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM [dbo].[AutoLiquidation] WHERE [PeriodeId] = {periodeId} AND [FournisseurId] = {supplierId};

IF {supplierId} > 0
BEGIN
INSERT INTO [dbo].[AutoLiquidation] ([PeriodeId], [FournisseurId], [NumFacture], [MontantBrutDevise], [MontantBrutDinars], [TauxChange], [TVA19])
SELECT
    {periodeId},
    {supplierId},
    NULLIF(LTRIM(RTRIM(j.[numFacture])), N''),
    TRY_CAST(j.[montantBrutDevise] AS DECIMAL(18,5)),
    TRY_CAST(j.[montantBrutDinars] AS DECIMAL(18,2)),
    TRY_CAST(j.[tauxChange] AS DECIMAL(18,5)),
    TRY_CAST(j.[tva19] AS DECIMAL(18,2))
FROM OPENJSON({payload}, '$.tva16Rows')
WITH (
    [numFacture] NVARCHAR(50) '$.numFacture',
    [montantBrutDevise] NVARCHAR(64) '$.montantBrutDevise',
    [tauxChange] NVARCHAR(64) '$.tauxChange',
    [montantBrutDinars] NVARCHAR(64) '$.montantBrutDinars',
    [tva19] NVARCHAR(64) '$.tva19'
) AS j;
END
");
                break;
            }
        }
    }

    private async Task DeleteNormalizedTabDataAsync(string tabKey, int periodeId, string direction, string? supplierScopeKey = null)
    {
        var normalizedTabKey = NormalizeTabKey(tabKey);
        var normalizedDirection = NormalizeDirectionValue(direction);

        switch (normalizedTabKey)
        {
            case "encaissement":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Encaissement] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};");
                break;
            case "tva_immo":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Tva] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection} AND [Type] = {"IMMO"};");
                break;
            case "tva_biens":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Tva] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection} AND [Type] = {"BS"};");
                break;
            case "ca_tap":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Ca71] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};");
                break;
            case "etat_tap":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Tap] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};");
                break;
            case "droits_timbre":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Timbre] WHERE [PeriodeId] = {periodeId} AND [Direction] = {normalizedDirection};");
                break;
            case "ca_siege":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[CaSiege] WHERE [PeriodeId] = {periodeId};");
                break;
            case "irg":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Irg] WHERE [PeriodeId] = {periodeId};");
                break;
            case "taxe2":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Taxe2] WHERE [PeriodeId] = {periodeId};");
                break;
            case "taxe_masters":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TaxeMaster] WHERE [PeriodeId] = {periodeId};");
                break;
            case "taxe_vehicule":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[TaxeVehicule] WHERE [PeriodeId] = {periodeId};");
                break;
            case "taxe_formation":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Formation] WHERE [PeriodeId] = {periodeId};");
                break;
            case "acompte":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[AcompteProvisionel] WHERE [PeriodeId] = {periodeId};");
                break;
            case "ibs":
            {
                var supplierId = int.TryParse((supplierScopeKey ?? string.Empty).Trim(), out var parsedSupplierId) ? parsedSupplierId : 0;
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Ibs] WHERE [PeriodeId] = {periodeId} AND [FournisseurId] = {supplierId};");
                break;
            }
            case "taxe_domicil":
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[Domiciliation] WHERE [PeriodeId] = {periodeId};");
                break;
            case "tva_autoliq":
            {
                var supplierId = int.TryParse((supplierScopeKey ?? string.Empty).Trim(), out var parsedSupplierId) ? parsedSupplierId : 0;
                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM [dbo].[AutoLiquidation] WHERE [PeriodeId] = {periodeId} AND [FournisseurId] = {supplierId};");
                break;
            }
        }
    }

    private async Task AutoApproveExpiredPendingDeclarationsAsync()
    {
        var pendingDeclarations = await _context.FiscalDeclarationHeaders
            .Include(d => d.Periode)
            .Where(d => d.Statut == "PENDING")
            .ToListAsync();

        var now = DateTime.Now;
        var hasChanges = false;

        foreach (var declaration in pendingDeclarations)
        {
            var deadlineRole = IsHeadOfficeDirection(declaration.Direction) ? "finance" : "regionale";
            if (!TryBuildPeriodDeadline(declaration.Periode.Mois.ToString(), declaration.Periode.Annee.ToString(), deadlineRole, out var deadline))
                continue;

            if (now <= deadline)
                continue;

            declaration.Statut = "APPROVED";
            declaration.SubmittedAt = DateTime.UtcNow;
            hasChanges = true;
        }

        if (hasChanges)
            await _context.SaveChangesAsync();
    }

    // ─── GET api/fiscal/policy ─────────────────────────────────────────────
    [HttpGet("policy")]
    public async Task<IActionResult> GetPolicy([FromQuery] string? direction)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;
        var isTable6Enabled = await IsTable6EnabledAsync();

        var regionalTabKeys = isTable6Enabled
            ? RegionalManageableTabOrder
            : RegionalManageableTabOrder.Where(tab => !string.Equals(tab, "etat_tap", StringComparison.OrdinalIgnoreCase)).ToArray();

        var financeTabKeys = FinanceManageableTabOrder;

        var manageableTabKeys = GetManageableTabsForRoleAndDirection(currentUserRole, direction);
        var disabledTabKeys = isTable6Enabled ? Array.Empty<string>() : new[] { "etat_tap" };

        return Ok(new
        {
            role = currentUserRole,
            requestedDirection = (direction ?? "").Trim(),
            deadlineDay = GetDeadlineDayForRole(currentUserRole),
            regionalTabKeys,
            financeTabKeys,
            manageableTabKeys,
            disabledTabKeys,
            serverNow = DateTime.UtcNow,
        });
    }

    // ─── GET api/fiscal/period-lock ───────────────────────────────────────
    [HttpGet("period-lock")]
    public async Task<IActionResult> GetPeriodLock([FromQuery] string mois, [FromQuery] string annee)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        if (!TryBuildPeriodDeadline(mois, annee, currentUserRole, out var deadline))
        {
            return BadRequest(new
            {
                message = "Période invalide.",
                mois,
                annee
            });
        }

        var isLocked = DateTime.Now > deadline;
        var periodLabel = $"{mois}/{annee}";

        return Ok(new
        {
            mois,
            annee,
            role = currentUserRole,
            isLocked,
            deadline,
            message = isLocked
                ? $"La période {periodLabel} est clôturée depuis le {deadline:dd/MM/yyyy HH:mm}."
                : $"La période {periodLabel} est encore ouverte jusqu'au {deadline:dd/MM/yyyy HH:mm}."
        });
    }

    // ─── GET api/fiscal ────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? tabKey, [FromQuery] string? mois, [FromQuery] string? annee)
    {
        await AutoApproveExpiredPendingDeclarationsAsync();

        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        var query = BuildDeclarationQuery();

        if (!string.IsNullOrWhiteSpace(tabKey))
        {
            var normalizedTabKey = NormalizeTabKey(tabKey);
            query = query.Where(d => d.TabKey.ToLower() == normalizedTabKey);
        }

        if (!string.IsNullOrWhiteSpace(mois) && int.TryParse(mois, out var m))
            query = query.Where(d => d.Mois == m.ToString());
        if (!string.IsNullOrWhiteSpace(annee) && int.TryParse(annee, out var y))
            query = query.Where(d => d.Annee == y.ToString());

        var declarations = await query
            .OrderByDescending(d => d.SubmittedAt)
            .ToListAsync();

        var visibleDeclarations = declarations
            .Where(d => IsDirectionAccessible(currentUserRole, currentUserContext.Direction, currentUserContext.Region, d.Direction))
            .ToList();

        var payloadMap = await GetPayloadMapAsync(visibleDeclarations.Select(d => d.Id));

        return Ok(visibleDeclarations.Select(d => new
        {
            d.Id,
            TabKey = d.TabKey,
            Mois = int.Parse(d.Mois).ToString("00"),
            Annee = d.Annee,
            d.Direction,
            DataJson = payloadMap.TryGetValue(d.Id, out var payloadJson) ? payloadJson : "{}",
            CreatedAt = d.SubmittedAt,
            UpdatedAt = d.SubmittedAt,
            UserId = 0,
            IsApproved = string.Equals(d.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase),
            ApprovedByUserId = (int?)null,
            ApprovedAt = string.Equals(d.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase) ? d.SubmittedAt : (DateTime?)null,
            Statut = d.Statut
        }));
    }

    // ─── GET api/fiscal/{id} ───────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        await AutoApproveExpiredPendingDeclarationsAsync();

        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);

        var declaration = await BuildDeclarationQuery().FirstOrDefaultAsync(d => d.Id == id);
        if (declaration == null)
            return NotFound();

        if (!IsDirectionAccessible(currentUserContext.Role, currentUserContext.Direction, currentUserContext.Region, declaration.Direction))
            return StatusCode(403, new { message = "Accès refusé. Vous ne pouvez consulter que les déclarations de votre groupe." });

        var dataJson = await BuildDataJsonFromNormalizedAsync(declaration);

        return Ok(new
        {
            declaration.Id,
            TabKey = declaration.TabKey,
            Mois = int.Parse(declaration.Mois).ToString("00"),
            Annee = declaration.Annee,
            declaration.Direction,
            DataJson = dataJson,
            CreatedAt = declaration.SubmittedAt,
            UpdatedAt = declaration.SubmittedAt,
            UserId = 0,
            IsApproved = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase),
            ApprovedByUserId = (int?)null,
            ApprovedAt = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase) ? declaration.SubmittedAt : (DateTime?)null,
            Statut = declaration.Statut
        });
    }

    // ─── GET api/fiscal/wilayas-communes ───────────────────────────────────
    [HttpGet("wilayas-communes")]
    public async Task<IActionResult> GetWilayasCommunes()
    {
        try
        {
            var result = new List<dynamic>();
            
            // Fetch all wilayas with their communes
            var query = @"
                  SELECT w.[Code], w.[Nom] as Wilaya,
                    c.[Code] as CommuneCode, c.[Code] as CommuneName
                FROM [dbo].[Wilaya] w
                LEFT JOIN [dbo].[Commune] c ON c.[WilayaId] = w.[Id]
                  ORDER BY w.[Code], c.[Code]
            ";
            
            var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = query;
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    var wilayasDict = new Dictionary<string, (string nom, List<(string id, string nom)> communes)>();
                    
                    while (await reader.ReadAsync())
                    {
                        var wilayaId = Convert.ToString(reader.GetValue(0), CultureInfo.InvariantCulture) ?? string.Empty;
                        var wilayaNom = Convert.ToString(reader.GetValue(1), CultureInfo.InvariantCulture) ?? string.Empty;
                        var communeId = reader.IsDBNull(2) ? null : Convert.ToString(reader.GetValue(2), CultureInfo.InvariantCulture);
                        var communeName = reader.IsDBNull(3) ? null : reader.GetString(3);
                        
                        if (!wilayasDict.ContainsKey(wilayaId))
                        {
                            wilayasDict[wilayaId] = (wilayaNom, new List<(string, string)>());
                        }
                        
                        if (!string.IsNullOrWhiteSpace(communeId) && !string.IsNullOrEmpty(communeName))
                        {
                            wilayasDict[wilayaId].communes.Add((communeId!, communeName));
                        }
                    }
                    
                    foreach (var kvp in wilayasDict)
                    {
                        result.Add(new
                        {
                            code = kvp.Key,
                            wilaya = kvp.Value.nom,
                            communes = kvp.Value.communes.Select(c => new { id = c.id, nom = c.nom }).ToList()
                        });
                    }
                }
            }
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erreur lors de la récupération des wilayas et communes", error = ex.Message });
        }
    }

    // ─── POST api/fiscal ───────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DeclarationRequest request)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        if (!TryNormalizePeriod(request.Mois, request.Annee, out var normalizedMois, out var normalizedAnnee))
            return BadRequest(new { message = "Période invalide." });

        if (string.Equals(NormalizeTabKey(request.TabKey), "etat_tap", StringComparison.OrdinalIgnoreCase)
            && !await IsTable6EnabledAsync())
        {
            return Conflict(new { message = "Le tableau 6 (ETAT TAP) est désactivé par l'administration." });
        }

        if (!CanManageTabForRole(currentUserRole, request.TabKey))
            return BuildTabAccessDeniedResponse(currentUserRole, request.TabKey);

        if (IsPeriodLocked(normalizedMois, normalizedAnnee, currentUserRole, out var periodDeadline))
            return BuildPeriodLockedResponse(normalizedMois, normalizedAnnee, periodDeadline);

        var targetDirection = ResolveDirectionForRole(currentUserRole, request.Direction, currentUserContext.Direction, currentUserContext.Region);

        var periode = await GetOrCreatePeriodeAsync(normalizedMois, normalizedAnnee);
        var normalizedTabKey = NormalizeTabKey(request.TabKey);
        var supplierScopeKey = ExtractSupplierScopeKey(normalizedTabKey, request.DataJson);

        var exists = await _context.FiscalDeclarationHeaders
            .AsNoTracking()
            .AnyAsync(d => d.PeriodeId == periode.Id
                && d.TableauCode.ToLower() == normalizedTabKey
                && d.Direction.ToLower() == targetDirection.ToLower()
                && d.SupplierScopeKey == supplierScopeKey);

        if (exists)
        {
            return Conflict(new
            {
                message = IsSupplierScopedTab(normalizedTabKey)
                    ? $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), ce fournisseur, cette direction et cette période ({normalizedMois}/{normalizedAnnee})."
                    : $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), cette direction et cette période ({normalizedMois}/{normalizedAnnee}).",
                isDoubloon = true
            });
        }

        var declaration = new FiscalDeclarationHeader
        {
            PeriodeId = periode.Id,
            Direction = targetDirection,
            TableauCode = normalizedTabKey,
            SupplierScopeKey = supplierScopeKey,
            Statut = "PENDING",
            SubmittedAt = DateTime.UtcNow,
        };

        _context.FiscalDeclarationHeaders.Add(declaration);
        await _context.SaveChangesAsync();

        await PersistNormalizedTabDataAsync(normalizedTabKey, periode.Id, targetDirection, request.DataJson);
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_SAVE", "Declaration", declaration.Id,
            new { TabKey = declaration.TableauCode, Mois = normalizedMois, Annee = normalizedAnnee, action = "create" });

        await NotifyFiscalDeclarationChangedAsync("create", declaration, periode, userId);

        return CreatedAtAction(nameof(GetById), new { id = declaration.Id },
            new { Id = declaration.Id, TabKey = declaration.TableauCode, Mois = normalizedMois, Annee = normalizedAnnee, CreatedAt = declaration.SubmittedAt });
    }

    // ─── PUT api/fiscal/{id} ───────────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] DeclarationRequest request)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        if (!TryNormalizePeriod(request.Mois, request.Annee, out var normalizedMois, out var normalizedAnnee))
            return BadRequest(new { message = "Période invalide." });

        var declaration = await _context.FiscalDeclarationHeaders
            .Include(d => d.Periode)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (declaration == null)
            return NotFound();

        if (!IsDirectionAccessible(currentUserRole, currentUserContext.Direction, currentUserContext.Region, declaration.Direction))
            return StatusCode(403, new { message = "Accès refusé. Vous ne pouvez modifier que les déclarations de votre groupe." });

        if (string.Equals(NormalizeTabKey(request.TabKey), "etat_tap", StringComparison.OrdinalIgnoreCase)
            && !await IsTable6EnabledAsync())
        {
            return Conflict(new { message = "Le tableau 6 (ETAT TAP) est désactivé par l'administration." });
        }

        if (IsPeriodLocked(declaration.Periode.Mois.ToString("00"), declaration.Periode.Annee.ToString(), currentUserRole, out var sourceDeadline))
            return BuildPeriodLockedResponse(declaration.Periode.Mois.ToString("00"), declaration.Periode.Annee.ToString(), sourceDeadline);

        if (IsPeriodLocked(normalizedMois, normalizedAnnee, currentUserRole, out var targetDeadline))
            return BuildPeriodLockedResponse(normalizedMois, normalizedAnnee, targetDeadline);

        var targetDirection = ResolveDirectionForRole(currentUserRole, request.Direction, currentUserContext.Direction, currentUserContext.Region, declaration.Direction);
        var normalizedTabKey = NormalizeTabKey(request.TabKey);
        var supplierScopeKey = ExtractSupplierScopeKey(normalizedTabKey, request.DataJson);
        var targetPeriode = await GetOrCreatePeriodeAsync(normalizedMois, normalizedAnnee);

        var duplicateExists = await _context.FiscalDeclarationHeaders
            .AsNoTracking()
            .AnyAsync(d => d.Id != id
                && d.PeriodeId == targetPeriode.Id
                && d.TableauCode.ToLower() == normalizedTabKey
                && d.Direction.ToLower() == targetDirection.ToLower()
                && d.SupplierScopeKey == supplierScopeKey);

        if (duplicateExists)
        {
            return Conflict(new
            {
                message = IsSupplierScopedTab(normalizedTabKey)
                    ? $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), ce fournisseur, cette direction et cette période ({normalizedMois}/{normalizedAnnee})."
                    : $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), cette direction et cette période ({normalizedMois}/{normalizedAnnee}).",
                isDoubloon = true
            });
        }

        declaration.PeriodeId = targetPeriode.Id;
        declaration.Direction = targetDirection;
        declaration.TableauCode = normalizedTabKey;
        declaration.SupplierScopeKey = supplierScopeKey;
        declaration.Statut = "PENDING";
        declaration.SubmittedAt = DateTime.UtcNow;

        await PersistNormalizedTabDataAsync(normalizedTabKey, targetPeriode.Id, targetDirection, request.DataJson);

        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_SAVE", "Declaration", declaration.Id,
            new { TabKey = declaration.TableauCode, Mois = normalizedMois, Annee = normalizedAnnee, action = "update", modifiedByUserId = userId });

        await NotifyFiscalDeclarationChangedAsync("update", declaration, targetPeriode, userId);

        return NoContent();
    }

    // ─── POST api/fiscal/{id}/approve ─────────────────────────────────────
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        await AutoApproveExpiredPendingDeclarationsAsync();

        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = (currentUserContext.Role ?? string.Empty).Trim().ToLowerInvariant();

        var canApproveAsAdmin = currentUserRole == "admin";
        var canApproveAsRegional = currentUserRole == "regionale";
        var canApproveAsFinance = currentUserRole == "finance" || currentUserRole == "comptabilite";

        if (!canApproveAsAdmin && !canApproveAsRegional && !canApproveAsFinance)
            return StatusCode(403, new { message = "Ce compte n'a pas le droit d'approbation." });

        var declaration = await _context.FiscalDeclarationHeaders
            .Include(d => d.Periode)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (declaration == null)
            return NotFound();

        if (!IsDirectionAccessible(currentUserRole, currentUserContext.Direction, currentUserContext.Region, declaration.Direction))
            return StatusCode(403, new { message = "Vous ne pouvez approuver que les déclarations de votre groupe." });

        if (string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new
            {
                message = "Déclaration déjà approuvée.",
                declaration.Id,
                IsApproved = true,
                ApprovedByUserId = (int?)null,
                ApprovedAt = declaration.SubmittedAt
            });
        }

        declaration.Statut = "APPROVED";
        declaration.SubmittedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_APPROVE", "Declaration", declaration.Id,
            new
            {
                TabKey = declaration.TableauCode,
                Mois = declaration.Periode.Mois.ToString("00"),
                Annee = declaration.Periode.Annee,
                approverRole = currentUserRole
            });

        await NotifyFiscalDeclarationChangedAsync("approve", declaration, declaration.Periode, userId);

        return Ok(new
        {
            message = "Déclaration approuvée avec succès.",
            declaration.Id,
            IsApproved = true,
            ApprovedByUserId = (int?)null,
            ApprovedAt = declaration.SubmittedAt
        });
    }

    // ─── DELETE api/fiscal/{id} ───────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        var declaration = await _context.FiscalDeclarationHeaders
            .Include(d => d.Periode)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (declaration == null)
            return NotFound();

        if (!IsDirectionAccessible(currentUserRole, currentUserContext.Direction, currentUserContext.Region, declaration.Direction))
            return StatusCode(403, new { message = "Accès refusé. Vous ne pouvez supprimer que les déclarations de votre groupe." });

        var mois = declaration.Periode.Mois.ToString("00");
        var annee = declaration.Periode.Annee.ToString();

        if (IsPeriodLocked(mois, annee, currentUserRole, out var periodDeadline))
            return BuildPeriodLockedResponse(mois, annee, periodDeadline);

        await DeleteNormalizedTabDataAsync(declaration.TableauCode, declaration.PeriodeId, declaration.Direction, declaration.SupplierScopeKey);

        _context.FiscalDeclarationHeaders.Remove(declaration);
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_DELETE", "Declaration", id,
            new { TabKey = declaration.TableauCode, Mois = mois, Annee = annee, deletedByUserId = userId });

        await NotifyFiscalDeclarationChangedAsync("delete", declaration, declaration.Periode, userId);

        return NoContent();
    }

    // ─── POST api/fiscal/{id}/print ───────────────────────────────────────
    [HttpPost("{id}/print")]
    public async Task<IActionResult> LogPrint(int id)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);

        var declaration = await _context.FiscalDeclarationHeaders
            .Include(d => d.Periode)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (declaration == null)
            return NotFound();

        if (!IsDirectionAccessible(currentUserContext.Role, currentUserContext.Direction, currentUserContext.Region, declaration.Direction))
            return StatusCode(403, new { message = "Accès refusé. Vous ne pouvez imprimer que les déclarations de votre groupe." });

        await _auditService.LogAction(userId, "FISCAL_PRINT", "Declaration", id,
            new { TabKey = declaration.TableauCode, Mois = declaration.Periode.Mois.ToString("00"), Annee = declaration.Periode.Annee.ToString() });

        return Ok(new { message = "Impression enregistrée dans l'audit." });
    }

    // ─── GET api/fiscal/recap-sources ─────────────────────────────────────
    [HttpGet("recap-sources")]
    public async Task<IActionResult> GetRecapSources([FromQuery] string mois, [FromQuery] string annee)
    {
        if (!TryNormalizePeriod(mois, annee, out var normalizedMois, out var normalizedAnnee))
            return BadRequest(new { message = "Période invalide." });

        var periode = await _context.Periodes
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Mois == int.Parse(normalizedMois) && p.Annee == int.Parse(normalizedAnnee));

        if (periode is null)
        {
            return Ok(new
            {
                encaissementByDirection = Array.Empty<object>(),
                tvaImmoByDirection = Array.Empty<object>(),
                tvaBiensByDirection = Array.Empty<object>(),
                caTapByDirection = Array.Empty<object>(),
                tapByDirection = Array.Empty<object>(),
                droitsTimbreByDirection = Array.Empty<object>(),
            });
        }

        var encaissementByDirection = await _context.Database.SqlQueryRaw<DirectionEncaissementSourceDto>(@"
SELECT [Direction] AS [Direction],
       SUM(ISNULL([MontantHT], 0)) AS [TotalHt],
       SUM(ISNULL([MontantTTC], 0)) AS [TotalTtc]
FROM [dbo].[Encaissement]
WHERE [PeriodeId] = {0}
GROUP BY [Direction]", periode.Id).ToListAsync();

        var tvaImmoByDirection = await _context.Database.SqlQueryRaw<DirectionAmountSourceDto>(@"
SELECT t.[Direction] AS [Direction],
       SUM(ISNULL(f.[TVA], 0)) AS [Amount]
FROM [dbo].[Tva] t
INNER JOIN [dbo].[Facture] f
    ON f.[IdFournisseur] = t.[IdFournisseur]
   AND f.[NumFacture] = t.[NumFacture]
   AND f.[DateFacture] = t.[DateFacture]
WHERE t.[PeriodeId] = {0} AND t.[Type] = 'IMMO'
GROUP BY t.[Direction]", periode.Id).ToListAsync();

        var tvaBiensByDirection = await _context.Database.SqlQueryRaw<DirectionAmountSourceDto>(@"
SELECT t.[Direction] AS [Direction],
       SUM(ISNULL(f.[TVA], 0)) AS [Amount]
FROM [dbo].[Tva] t
INNER JOIN [dbo].[Facture] f
    ON f.[IdFournisseur] = t.[IdFournisseur]
   AND f.[NumFacture] = t.[NumFacture]
   AND f.[DateFacture] = t.[DateFacture]
WHERE t.[PeriodeId] = {0} AND t.[Type] = 'BS'
GROUP BY t.[Direction]", periode.Id).ToListAsync();

        var caTapByDirection = await _context.Database.SqlQueryRaw<DirectionCaTapSourceDto>(@"
SELECT c.[Direction] AS [Direction],
       SUM(CASE WHEN l.[Designation] = 'B12' THEN ISNULL(c.[MontantCA], 0) ELSE 0 END) AS [B12],
       SUM(CASE WHEN l.[Designation] = 'B13' THEN ISNULL(c.[MontantCA], 0) ELSE 0 END) AS [B13]
FROM [dbo].[Ca71] c
INNER JOIN [dbo].[Ca71Ligne] l ON l.[Id] = c.[LigneId]
WHERE c.[PeriodeId] = {0}
GROUP BY c.[Direction]", periode.Id).ToListAsync();

        var tapByDirection = await _context.Database.SqlQueryRaw<DirectionTapSourceDto>(@"
SELECT [Direction] AS [Direction],
       SUM(ISNULL([MontantImposable], 0)) AS [Base],
       SUM(ISNULL([MontantTAP], 0)) AS [Taxe]
FROM [dbo].[Tap]
WHERE [PeriodeId] = {0}
GROUP BY [Direction]", periode.Id).ToListAsync();

        var droitsTimbreByDirection = await _context.Database.SqlQueryRaw<DirectionDroitsTimbreSourceDto>(@"
SELECT [Direction] AS [Direction],
       SUM(ISNULL([ChiffreAffaireTTC], 0)) AS [TotalCa],
       SUM(ISNULL([DroitTimbre], 0)) AS [TotalMontant]
FROM [dbo].[Timbre]
WHERE [PeriodeId] = {0}
GROUP BY [Direction]", periode.Id).ToListAsync();

        return Ok(new
        {
            encaissementByDirection,
            tvaImmoByDirection,
            tvaBiensByDirection,
            caTapByDirection,
            tapByDirection,
            droitsTimbreByDirection,
        });
    }

    // ─── GET api/fiscal/reminders ─────────────────────────────────────────
    [HttpGet("reminders")]
    public async Task<IActionResult> GetReminders([FromQuery] string? mois, [FromQuery] string? annee)
    {
        await AutoApproveExpiredPendingDeclarationsAsync();

        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = (currentUserContext.Role ?? string.Empty).Trim().ToLowerInvariant();
        var isTable6Enabled = await IsTable6EnabledAsync();

        var now = DateTime.Now;
        DateTime fiscalCurrentPeriodDate = now.Day >= 11 ? now : now.AddMonths(-1);
        DateTime activePeriodDate = fiscalCurrentPeriodDate;

        if (int.TryParse((mois ?? string.Empty).Trim(), out var requestedMonth)
            && int.TryParse((annee ?? string.Empty).Trim(), out var requestedYear)
            && requestedMonth >= 1
            && requestedMonth <= 12
            && requestedYear >= 1900
            && requestedYear <= 9999)
        {
            activePeriodDate = new DateTime(requestedYear, requestedMonth, 1);
        }

        var currentMonth = activePeriodDate.Month.ToString("00");
        var currentYear = activePeriodDate.Year.ToString();

        var visibleDeclarations = await BuildDeclarationQuery()
            .Where(d => d.Mois == activePeriodDate.Month.ToString() && d.Annee == activePeriodDate.Year.ToString())
            .ToListAsync();

        visibleDeclarations = visibleDeclarations
            .Where(d => IsDirectionAccessible(currentUserRole, currentUserContext.Direction, currentUserContext.Region, d.Direction))
            .ToList();

        var allAccessibleDirections = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (currentUserRole == "admin")
        {
            var allRegions = await _context.Regions.Select(r => r.Name).ToListAsync();
            allAccessibleDirections.UnionWith(allRegions);
            allAccessibleDirections.Add("Siège");
        }
        else if (currentUserRole == "regionale")
        {
            var userRegion = currentUserContext.Region ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(userRegion))
                allAccessibleDirections.Add(userRegion);
            allAccessibleDirections.Add("Siège");
        }
        else if (currentUserRole is "finance" or "comptabilite")
        {
            allAccessibleDirections.Add("Siège");
        }
        else if (currentUserRole == "direction")
        {
            var allRegions = await _context.Regions.Select(r => r.Name).ToListAsync();
            allAccessibleDirections.UnionWith(allRegions);
            allAccessibleDirections.Add("Siège");
        }
        else
        {
            var userRegion = currentUserContext.Region ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(userRegion))
                allAccessibleDirections.Add(userRegion);
            allAccessibleDirections.Add("Siège");
        }

        var declarationsByDirectionMap = visibleDeclarations
            .Where(d => !string.IsNullOrWhiteSpace(d.Direction))
            .GroupBy(d => NormalizeDirectionKey(d.Direction), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Select(d => (TabKey: d.TabKey, IsApproved: string.Equals(d.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase))).ToList(),
                StringComparer.OrdinalIgnoreCase);

        var reminders = new List<ReminderDto>();

        foreach (var direction in allAccessibleDirections)
        {
            var normalizedDirectionKey = NormalizeDirectionKey(direction);
            var isSiegeDirection = IsHeadOfficeDirection(normalizedDirectionKey);
            var assignedTabs = (isSiegeDirection ? FinanceManageableTabOrder : RegionalManageableTabOrder)
                .Where(tab => isTable6Enabled || !string.Equals(tab, "etat_tap", StringComparison.OrdinalIgnoreCase))
                .Where(tab => IsAcompteAllowedForMonth(currentMonth) || !string.Equals(tab, "acompte", StringComparison.OrdinalIgnoreCase))
                .ToArray();
            var roleForDeadline = isSiegeDirection ? "finance" : "regionale";

            if (!TryBuildPeriodDeadline(currentMonth, currentYear, roleForDeadline, out var deadline))
                continue;

            var deadlineEndOfDay = deadline.AddDays(1).Date;
            var daysUntilDeadline = (int)Math.Floor((deadlineEndOfDay - now).TotalDays);

            declarationsByDirectionMap.TryGetValue(normalizedDirectionKey, out var declarationsForDirection);
            declarationsForDirection ??= new List<(string TabKey, bool IsApproved)>();

            var enteredTabSet = declarationsForDirection
                .Select(d => d.TabKey)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var approvedTabSet = declarationsForDirection
                .Where(d => d.IsApproved)
                .Select(d => d.TabKey)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var enteredTabs = assignedTabs.Count(tab => enteredTabSet.Contains(tab));
            var approvedTabs = assignedTabs.Count(tab => approvedTabSet.Contains(tab));
            var remainingToEnterTabs = assignedTabs.Length - enteredTabs;
            var remainingToApproveTabs = enteredTabs - approvedTabs;

            var missingTabs = assignedTabs
                .Where(tab => !approvedTabSet.Contains(tab))
                .ToList();
            var missingToEnterTabs = assignedTabs
                .Where(tab => !enteredTabSet.Contains(tab))
                .ToList();

            reminders.Add(new ReminderDto
            {
                Direction = direction,
                Mois = currentMonth,
                Annee = currentYear,
                Deadline = deadline,
                DaysUntilDeadline = daysUntilDeadline,
                TotalTabs = assignedTabs.Length,
                EnteredTabs = enteredTabs,
                ApprovedTabs = approvedTabs,
                RemainingToEnterTabs = remainingToEnterTabs,
                RemainingToApproveTabs = remainingToApproveTabs,
                MissingTabs = missingTabs,
                MissingToEnterTabs = missingToEnterTabs,
                IsUrgent = daysUntilDeadline <= 5
            });
        }

        return Ok(new { reminders });
    }
}

public class DeclarationRequest
{
    public string TabKey { get; set; } = string.Empty;
    public string Mois { get; set; } = string.Empty;
    public string Annee { get; set; } = string.Empty;
    public string? Direction { get; set; }
    public string? DataJson { get; set; }
}

public sealed class DirectionEncaissementSourceDto
{
    public string Direction { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal TotalHt { get; set; }
    [Precision(18, 5)]
    public decimal TotalTtc { get; set; }
}

public sealed class DirectionAmountSourceDto
{
    public string Direction { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal Amount { get; set; }
}

public sealed class DirectionCaTapSourceDto
{
    public string Direction { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal B12 { get; set; }
    [Precision(18, 5)]
    public decimal B13 { get; set; }
}

public sealed class DirectionTapSourceDto
{
    public string Direction { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal Base { get; set; }
    [Precision(18, 5)]
    public decimal Taxe { get; set; }
}

public sealed class DirectionDroitsTimbreSourceDto
{
    public string Direction { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal TotalCa { get; set; }
    [Precision(18, 5)]
    public decimal TotalMontant { get; set; }
}

internal sealed class EncaissementPayloadRow
{
    public string Designation { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal? MontantHT { get; set; }
}

internal sealed class TvaPayloadRow
{
    public int FournisseurId { get; set; }
    public string NomRaisonSociale { get; set; } = string.Empty;
    public string Adresse { get; set; } = string.Empty;
    public string Nif { get; set; } = string.Empty;
    public string NumRC { get; set; } = string.Empty;
    public string NumFacture { get; set; } = string.Empty;
    public DateTime? DateFacture { get; set; }
    [Precision(18, 5)]
    public decimal? MontantHT { get; set; }
    [Precision(18, 5)]
    public decimal? TVA { get; set; }
}

internal sealed class TimbrePayloadRow
{
    public string Designation { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal? ChiffreAffaireTTC { get; set; }
    [Precision(18, 5)]
    public decimal? DroitTimbre { get; set; }
}

internal sealed class CaTapPayloadRow
{
    public string Designation { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal? MontantCA { get; set; }
}

internal sealed class TapPayloadRow
{
    public string WilayaCode { get; set; } = string.Empty;
    public string Commune { get; set; } = string.Empty;
    [Precision(18, 5)]
    public decimal? MontantImposable { get; set; }
}

internal sealed class CaSiegePayloadRow
{
    [Precision(18, 5)]
    public decimal? MontantTTC { get; set; }
    [Precision(18, 5)]
    public decimal? MontantHT { get; set; }
}

internal sealed class IrgPayloadRow
{
    [Precision(18, 5)]
    public decimal? AssietteImposable { get; set; }
    [Precision(18, 5)]
    public decimal? Montant { get; set; }
}

internal sealed class Taxe2PayloadRow
{
    [Precision(18, 5)]
    public decimal? BaseMontant { get; set; }
    [Precision(18, 5)]
    public decimal? MontantTaxe { get; set; }
}

internal sealed class TaxeMasterPayloadRow
{
    public DateTime? DateFacture { get; set; }
    public string? Nom { get; set; }
    public string? NumFacture { get; set; }
    [Precision(18, 5)]
    public decimal? MontantHT { get; set; }
    [Precision(18, 5)]
    public decimal? Taxe { get; set; }
    public int? Mois { get; set; }
    public string? Observation { get; set; }
}

internal sealed class TaxeVehiculePayloadRow
{
    [Precision(18, 5)]
    public decimal? Montant { get; set; }
}

internal sealed class TaxeFormationPayloadRow
{
    [Precision(18, 5)]
    public decimal? Montant { get; set; }
}

internal sealed class AcomptePayloadRow
{
    public int Id { get; set; }
    public int? MonthIndex { get; set; }
    [Precision(18, 5)]
    public decimal? Montant { get; set; }
}

internal sealed class IbsPayloadRow
{
    public string? NumFacture { get; set; }
    [Precision(18, 5)]
    public decimal? MontantBrutDevise { get; set; }
    [Precision(18, 5)]
    public decimal? MontantBrutDinars { get; set; }
    [Precision(18, 5)]
    public decimal? MontantNetTransferableDevise { get; set; }
    [Precision(18, 5)]
    public decimal? MontantIBS { get; set; }
    [Precision(18, 5)]
    public decimal? MontantNetTransferableDinars { get; set; }
}

internal sealed class DomiciliationPayloadRow
{
    public string? NumFacture { get; set; }
    public DateTime? DateFacture { get; set; }
    public string? RaisonSociale { get; set; }
    [Precision(18, 5)]
    public decimal? MontantNetDevise { get; set; }
    public string? Devise { get; set; }
    [Precision(18, 5)]
    public decimal? TauxChange { get; set; }
    [Precision(18, 5)]
    public decimal? MontantDinars { get; set; }
    [Precision(18, 5)]
    public decimal? TauxTaxe { get; set; }
    [Precision(18, 5)]
    public decimal? MontantAPayerDinars { get; set; }
}

internal sealed class AutoLiquidationPayloadRow
{
    public string? NumFacture { get; set; }
    [Precision(18, 5)]
    public decimal? MontantBrutDevise { get; set; }
    [Precision(18, 5)]
    public decimal? TauxChange { get; set; }
    [Precision(18, 5)]
    public decimal? MontantBrutDinars { get; set; }
    [Precision(18, 5)]
    public decimal? TVA19 { get; set; }
}

public sealed class ReminderDto
{
    public string Direction { get; set; } = string.Empty;
    public string Mois { get; set; } = string.Empty;
    public string Annee { get; set; } = string.Empty;
    public DateTime Deadline { get; set; }
    public int DaysUntilDeadline { get; set; }
    public int TotalTabs { get; set; }
    public int EnteredTabs { get; set; }
    public int ApprovedTabs { get; set; }
    public int RemainingToEnterTabs { get; set; }
    public int RemainingToApproveTabs { get; set; }
    public List<string> MissingTabs { get; set; } = new();
    public List<string> MissingToEnterTabs { get; set; } = new();
    public bool IsUrgent { get; set; }
}