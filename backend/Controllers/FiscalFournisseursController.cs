using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/fiscal-fournisseurs")]
[Authorize]
public class FiscalFournisseursController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;

    public FiscalFournisseursController(AppDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    private static string NormalizeNif(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Concat(value.Where(c => !char.IsWhiteSpace(c))).Trim().ToUpperInvariant();
    }

    private static string NormalizeAddress(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Join(' ', value.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private async Task<List<FiscalFournisseurView>> LoadFournisseursAsync()
    {
        return await _context.Database.SqlQueryRaw<FiscalFournisseurView>(@"
SELECT
    [Id] AS [Id],
    [Nom] AS [RaisonSociale],
    ISNULL([Adresse], N'') AS [Adresse],
    N'' AS [AuthNif],
    ISNULL([RC], N'') AS [Rc],
    N'' AS [AuthRc],
    ISNULL([NIF], N'') AS [Nif],
    SYSUTCDATETIME() AS [CreatedAt],
    SYSUTCDATETIME() AS [UpdatedAt]
FROM [dbo].[Fournisseur]
ORDER BY [Nom]
").ToListAsync();
    }

    private async Task<bool> FiscalFournisseurIdentityExistsAsync(string nif, string? adresse, int? excludedId = null)
    {
        var normalizedNif = NormalizeNif(nif);
        var normalizedAdresse = NormalizeAddress(adresse);
        if (string.IsNullOrWhiteSpace(normalizedNif) && string.IsNullOrWhiteSpace(normalizedAdresse)) return false;

        var candidates = await _context.Database.SqlQueryRaw<FiscalFournisseurIdentity>(@"
SELECT [Id], ISNULL([NIF], N'') AS [Nif], ISNULL([Adresse], N'') AS [Adresse]
FROM [dbo].[Fournisseur]
").ToListAsync();

        foreach (var item in candidates)
        {
            if (excludedId.HasValue && item.Id == excludedId.Value)
                continue;

            if (NormalizeNif(item.Nif) == normalizedNif && NormalizeAddress(item.Adresse) == normalizedAdresse)
                return true;
        }

        return false;
    }

    // GET api/fiscal-fournisseurs
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var fournisseurs = await LoadFournisseursAsync();
        return Ok(fournisseurs.Select(f => new
        {
            id = f.Id,
            raisonSociale = f.RaisonSociale,
            adresse = f.Adresse,
            authNif = f.AuthNif,
            rc = f.Rc,
            authRc = f.AuthRc,
            nif = f.Nif,
            createdAt = f.CreatedAt,
            updatedAt = f.UpdatedAt
        }));
    }

    // POST api/fiscal-fournisseurs
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FiscalFournisseurDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RaisonSociale))
            return BadRequest(new { message = "La raison sociale est obligatoire." });

        if (string.IsNullOrWhiteSpace(dto.NIF))
            return BadRequest(new { message = "Le NIF est obligatoire." });

        if (await FiscalFournisseurIdentityExistsAsync(dto.NIF, dto.Adresse))
            return Conflict(new { message = "Un fournisseur fiscal avec ce couple NIF + adresse existe deja." });

        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized();

        var nifValue = string.IsNullOrWhiteSpace(dto.NIF) ? null : dto.NIF.Trim();
        var rcValue = string.IsNullOrWhiteSpace(dto.RC) ? null : dto.RC.Trim();
        var adresseValue = string.IsNullOrWhiteSpace(dto.Adresse) ? null : dto.Adresse.Trim();

        await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [dbo].[Fournisseur] ([Nom], [EstEtranger], [NIF], [RC], [Adresse])
    VALUES ({dto.RaisonSociale.Trim()}, {true}, {nifValue}, {rcValue}, {adresseValue});
");

        var createdRows = await _context.Database.SqlQueryRaw<FiscalFournisseurView>(@"
SELECT TOP 1
    [Id] AS [Id],
    [Nom] AS [RaisonSociale],
    ISNULL([Adresse], N'') AS [Adresse],
    N'' AS [AuthNif],
    ISNULL([RC], N'') AS [Rc],
    N'' AS [AuthRc],
    ISNULL([NIF], N'') AS [Nif],
    SYSUTCDATETIME() AS [CreatedAt],
    SYSUTCDATETIME() AS [UpdatedAt]
FROM [dbo].[Fournisseur]
ORDER BY [Id] DESC
").ToListAsync();

    var created = createdRows.First();

        await _auditService.LogAction(
            userId,
            "FISCAL_FOURNISSEUR_CREATE",
            "Fournisseur",
            created.Id,
            new
            {
                created.RaisonSociale,
                NIF = created.Nif,
                RC = created.Rc
            }
        );

        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, new
        {
            id = created.Id,
            raisonSociale = created.RaisonSociale,
            adresse = created.Adresse,
            authNif = created.AuthNif,
            rc = created.Rc,
            authRc = created.AuthRc,
            nif = created.Nif,
            createdAt = created.CreatedAt,
            updatedAt = created.UpdatedAt
        });
    }

    // PUT api/fiscal-fournisseurs/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] FiscalFournisseurDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RaisonSociale))
            return BadRequest(new { message = "La raison sociale est obligatoire." });

        if (string.IsNullOrWhiteSpace(dto.NIF))
            return BadRequest(new { message = "Le NIF est obligatoire." });

        if (await FiscalFournisseurIdentityExistsAsync(dto.NIF, dto.Adresse, id))
            return Conflict(new { message = "Un fournisseur fiscal avec ce couple NIF + adresse existe deja." });

        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized();

        var nifValue = string.IsNullOrWhiteSpace(dto.NIF) ? null : dto.NIF.Trim();
        var rcValue = string.IsNullOrWhiteSpace(dto.RC) ? null : dto.RC.Trim();
        var adresseValue = string.IsNullOrWhiteSpace(dto.Adresse) ? null : dto.Adresse.Trim();

        var existingRows = await _context.Database.SqlQueryRaw<FiscalFournisseurView>(@"
SELECT
    [Id] AS [Id],
    [Nom] AS [RaisonSociale],
    ISNULL([Adresse], N'') AS [Adresse],
    N'' AS [AuthNif],
    ISNULL([RC], N'') AS [Rc],
    N'' AS [AuthRc],
    ISNULL([NIF], N'') AS [Nif],
    SYSUTCDATETIME() AS [CreatedAt],
    SYSUTCDATETIME() AS [UpdatedAt]
FROM [dbo].[Fournisseur]
WHERE [Id] = {0}
", id).ToListAsync();

    var existing = existingRows.FirstOrDefault();

        if (existing is null)
            return NotFound(new { message = "Fournisseur introuvable." });

        var oldValues = new
        {
            existing.RaisonSociale,
            existing.Adresse,
            NIF = existing.Nif,
            RC = existing.Rc,
        };

        await _context.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE [dbo].[Fournisseur]
SET [Nom] = {dto.RaisonSociale.Trim()},
    [NIF] = {nifValue},
    [RC] = {rcValue},
    [Adresse] = {adresseValue}
WHERE [Id] = {id}
");

        var updatedRows = await _context.Database.SqlQueryRaw<FiscalFournisseurView>(@"
SELECT
    [Id] AS [Id],
    [Nom] AS [RaisonSociale],
    ISNULL([Adresse], N'') AS [Adresse],
    N'' AS [AuthNif],
    ISNULL([RC], N'') AS [Rc],
    N'' AS [AuthRc],
    ISNULL([NIF], N'') AS [Nif],
    SYSUTCDATETIME() AS [CreatedAt],
    SYSUTCDATETIME() AS [UpdatedAt]
FROM [dbo].[Fournisseur]
WHERE [Id] = {0}
", id).ToListAsync();

    var updated = updatedRows.First();

        await _auditService.LogAction(
            userId,
            "FISCAL_FOURNISSEUR_UPDATE",
            "Fournisseur",
            id,
            new
            {
                oldValues,
                newValues = new
                {
                    updated.RaisonSociale,
                    updated.Adresse,
                    NIF = updated.Nif,
                    RC = updated.Rc,
                }
            }
        );

        return Ok(new
        {
            id = updated.Id,
            raisonSociale = updated.RaisonSociale,
            adresse = updated.Adresse,
            authNif = updated.AuthNif,
            rc = updated.Rc,
            authRc = updated.AuthRc,
            nif = updated.Nif,
            createdAt = updated.CreatedAt,
            updatedAt = updated.UpdatedAt
        });
    }

    // DELETE api/fiscal-fournisseurs/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized();

        var fournisseurRows = await _context.Database.SqlQueryRaw<FiscalFournisseurView>(@"
SELECT
    [Id] AS [Id],
    [Nom] AS [RaisonSociale],
    ISNULL([Adresse], N'') AS [Adresse],
    N'' AS [AuthNif],
    ISNULL([RC], N'') AS [Rc],
    N'' AS [AuthRc],
    ISNULL([NIF], N'') AS [Nif],
    SYSUTCDATETIME() AS [CreatedAt],
    SYSUTCDATETIME() AS [UpdatedAt]
FROM [dbo].[Fournisseur]
WHERE [Id] = {0}
", id).ToListAsync();

    var fournisseur = fournisseurRows.FirstOrDefault();

        if (fournisseur is null)
            return NotFound(new { message = "Fournisseur introuvable." });

        await _context.Database.ExecuteSqlInterpolatedAsync($@"DELETE FROM [dbo].[Fournisseur] WHERE [Id] = {id}");

        await _auditService.LogAction(
            userId,
            "FISCAL_FOURNISSEUR_DELETE",
            "Fournisseur",
            id,
            new
            {
                fournisseur.RaisonSociale,
                fournisseur.Adresse,
                NIF = fournisseur.Nif,
                RC = fournisseur.Rc,
            }
        );

        return NoContent();
    }

    // POST api/fiscal-fournisseurs/import-audit
    [HttpPost("import-audit")]
    public async Task<IActionResult> LogImportAudit([FromBody] FiscalFournisseurImportAuditRequest request)
    {
        var userId = GetCurrentUserId();

        await _auditService.LogAction(
            userId,
            "FISCAL_FOURNISSEUR_IMPORT",
            "Fournisseur",
            null,
            new
            {
                request.Created,
                request.Updated,
                request.Kept,
                request.Unchanged,
                request.Ignored,
                request.Errors,
                request.Source,
            }
        );

        return Ok(new { message = "Import audit log enregistré." });
    }

    private sealed class FiscalFournisseurIdentity
    {
        public int Id { get; set; }
        public string Nif { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
    }

    private sealed class FiscalFournisseurView
    {
        public int Id { get; set; }
        public string RaisonSociale { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
        public string AuthNif { get; set; } = string.Empty;
        public string Rc { get; set; } = string.Empty;
        public string AuthRc { get; set; } = string.Empty;
        public string Nif { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

public class FiscalFournisseurDto
{
    public string RaisonSociale { get; set; } = string.Empty;
    public string? Adresse { get; set; }
    public string? AuthNIF { get; set; }
    public string? RC { get; set; }
    public string? AuthRC { get; set; }
    public string? NIF { get; set; }
}

public class FiscalFournisseurImportAuditRequest
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Kept { get; set; }
    public int Unchanged { get; set; }
    public int Ignored { get; set; }
    public int Errors { get; set; }
    public string? Source { get; set; }
}
