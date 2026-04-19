using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Data.SqlClient;

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

    private async Task<User?> GetCurrentUserAsync()
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return null;
        return await _context.Users.FindAsync(userId);
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

    private async Task<bool> FiscalFournisseurIdentityExistsAsync(string nif, string? adresse, int? excludedId = null)
    {
        var normalizedNif = NormalizeNif(nif);
        var normalizedAdresse = NormalizeAddress(adresse);
        if (string.IsNullOrWhiteSpace(normalizedNif) && string.IsNullOrWhiteSpace(normalizedAdresse)) return false;

        var candidates = await _context.FiscalFournisseurs
            .AsNoTracking()
            .Select(f => new { f.Id, f.NIF, f.Adresse })
            .ToListAsync();

        foreach (var item in candidates)
        {
            if (excludedId.HasValue && item.Id == excludedId.Value)
                continue;

            if (NormalizeNif(item.NIF) == normalizedNif && NormalizeAddress(item.Adresse) == normalizedAdresse)
                return true;
        }

        return false;
    }

    // GET api/fiscal-fournisseurs
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var fournisseurs = await _context.FiscalFournisseurs
                .OrderBy(f => f.RaisonSociale)
                .Select(f => new {
                    id = f.Id,
                    raisonSociale = f.RaisonSociale,
                    adresse = f.Adresse,
                    authNif = f.AuthNIF,
                    rc = f.RC,
                    authRc = f.AuthRC,
                    nif = f.NIF,
                    createdAt = f.CreatedAt,
                    updatedAt = f.UpdatedAt
                })
                .ToListAsync();
            return Ok(fournisseurs);
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            // Keep declaration page functional even if the supplier table is temporarily missing.
            return Ok(Array.Empty<object>());
        }
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

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var fournisseur = new FiscalFournisseur
        {
            UserId = userId,
            RaisonSociale = dto.RaisonSociale.Trim(),
            Adresse = dto.Adresse?.Trim() ?? string.Empty,
            AuthNIF = dto.AuthNIF?.Trim() ?? string.Empty,
            RC = dto.RC?.Trim() ?? string.Empty,
            AuthRC = dto.AuthRC?.Trim() ?? string.Empty,
            NIF = dto.NIF?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.FiscalFournisseurs.Add(fournisseur);
        await _context.SaveChangesAsync();

        try
        {
            await _auditService.LogAction(
                userId,
                "FISCAL_FOURNISSEUR_CREATE",
                "FiscalFournisseur",
                fournisseur.Id,
                new
                {
                    fournisseur.RaisonSociale,
                    fournisseur.NIF,
                    fournisseur.AuthNIF,
                    fournisseur.RC,
                    fournisseur.AuthRC
                }
            );

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Impossible d'enregistrer l'action d'audit pour ce fournisseur fiscal." });
        }

        return CreatedAtAction(nameof(GetAll), new { id = fournisseur.Id }, new {
            id = fournisseur.Id,
            raisonSociale = fournisseur.RaisonSociale,
            adresse = fournisseur.Adresse,
            authNif = fournisseur.AuthNIF,
            rc = fournisseur.RC,
            authRc = fournisseur.AuthRC,
            nif = fournisseur.NIF,
            createdAt = fournisseur.CreatedAt,
            updatedAt = fournisseur.UpdatedAt
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
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var fournisseur = await _context.FiscalFournisseurs
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fournisseur == null)
            return NotFound(new { message = "Fournisseur introuvable." });

        // L'admin peut gérer tous les fournisseurs fiscaux, sinon uniquement ses propres entrées.
        if (currentUser.Role != "admin" && fournisseur.UserId != userId)
            return Forbid();

        var oldValues = new
        {
            fournisseur.RaisonSociale,
            fournisseur.Adresse,
            fournisseur.AuthNIF,
            fournisseur.RC,
            fournisseur.AuthRC,
            fournisseur.NIF,
        };

        fournisseur.RaisonSociale = dto.RaisonSociale.Trim();
        fournisseur.Adresse = dto.Adresse?.Trim() ?? string.Empty;
        fournisseur.AuthNIF = dto.AuthNIF?.Trim() ?? string.Empty;
        fournisseur.RC = dto.RC?.Trim() ?? string.Empty;
        fournisseur.AuthRC = dto.AuthRC?.Trim() ?? string.Empty;
        fournisseur.NIF = dto.NIF?.Trim() ?? string.Empty;
        fournisseur.UpdatedAt = DateTime.UtcNow;

        var auditPayload = new
        {
            oldValues,
            newValues = new
            {
                fournisseur.RaisonSociale,
                fournisseur.Adresse,
                fournisseur.AuthNIF,
                fournisseur.RC,
                fournisseur.AuthRC,
                fournisseur.NIF,
            }
        };

        await _context.SaveChangesAsync();

        try
        {
            await _auditService.LogAction(
                userId,
                "FISCAL_FOURNISSEUR_UPDATE",
                "FiscalFournisseur",
                fournisseur.Id,
                auditPayload
            );

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Impossible d'enregistrer l'action d'audit pour ce fournisseur fiscal." });
        }

        return Ok(new {
            id = fournisseur.Id,
            raisonSociale = fournisseur.RaisonSociale,
            adresse = fournisseur.Adresse,
            authNif = fournisseur.AuthNIF,
            rc = fournisseur.RC,
            authRc = fournisseur.AuthRC,
            nif = fournisseur.NIF,
            createdAt = fournisseur.CreatedAt,
            updatedAt = fournisseur.UpdatedAt
        });
    }

    // DELETE api/fiscal-fournisseurs/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var fournisseur = await _context.FiscalFournisseurs
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fournisseur == null)
            return NotFound(new { message = "Fournisseur introuvable." });

        // L'admin peut gérer tous les fournisseurs fiscaux, sinon uniquement ses propres entrées.
        if (currentUser.Role != "admin" && fournisseur.UserId != userId)
            return Forbid();

        var auditPayload = new
        {
            fournisseur.RaisonSociale,
            fournisseur.Adresse,
            fournisseur.AuthNIF,
            fournisseur.RC,
            fournisseur.AuthRC,
            fournisseur.NIF,
        };

        _context.FiscalFournisseurs.Remove(fournisseur);
        await _context.SaveChangesAsync();

        try
        {
            await _auditService.LogAction(
                userId,
                "FISCAL_FOURNISSEUR_DELETE",
                "FiscalFournisseur",
                id,
                auditPayload
            );

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Impossible d'enregistrer l'action d'audit pour ce fournisseur fiscal." });
        }

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
            "FiscalFournisseur",
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
