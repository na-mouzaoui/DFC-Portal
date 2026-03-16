using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FiscalController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;

    public FiscalController(AppDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    private static bool IsTvaTab(string tabKey) => tabKey is "tva_immo" or "tva_biens";

    private static string NormalizeInvoicePart(string? value) => (value ?? "").Trim().ToUpperInvariant();

    private static string NormalizeInvoiceDate(string? value)
    {
        var raw = (value ?? "").Trim();
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var sepIndex = raw.IndexOf('T');
        return sepIndex > 0 ? raw[..sepIndex] : raw;
    }

    private static string BuildSupplierKey(TvaInvoiceRow row)
    {
        var supplierId = NormalizeInvoicePart(row.FournisseurId);
        if (!string.IsNullOrWhiteSpace(supplierId)) return $"ID:{supplierId}";

        var supplierName = NormalizeInvoicePart(row.NomRaisonSociale);
        return string.IsNullOrWhiteSpace(supplierName) ? "" : $"NAME:{supplierName}";
    }

    private static string BuildInvoiceComposite(TvaInvoiceRow row)
    {
        var supplierKey = BuildSupplierKey(row);
        var reference = NormalizeInvoicePart(row.NumFacture);
        var date = NormalizeInvoiceDate(row.DateFacture);

        if (string.IsNullOrWhiteSpace(supplierKey) || string.IsNullOrWhiteSpace(reference) || string.IsNullOrWhiteSpace(date))
            return "";

        return $"{supplierKey}|{reference}|{date}";
    }

    private static string BuildInvoiceLabel(TvaInvoiceRow row)
    {
        var supplier = string.IsNullOrWhiteSpace(row.NomRaisonSociale)
            ? (string.IsNullOrWhiteSpace(row.FournisseurId) ? "—" : row.FournisseurId)
            : row.NomRaisonSociale;

        return $"{supplier} | {row.NumFacture} | {NormalizeInvoiceDate(row.DateFacture)}";
    }

    private static List<TvaInvoiceRow> ExtractTvaRows(string tabKey, string? dataJson)
    {
        if (string.IsNullOrWhiteSpace(dataJson)) return new List<TvaInvoiceRow>();

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            if (tabKey == "tva_immo")
            {
                var payload = JsonSerializer.Deserialize<TvaImmoPayload>(dataJson, options);
                return payload?.TvaImmoRows ?? new List<TvaInvoiceRow>();
            }

            if (tabKey == "tva_biens")
            {
                var payload = JsonSerializer.Deserialize<TvaBiensPayload>(dataJson, options);
                return payload?.TvaBiensRows ?? new List<TvaInvoiceRow>();
            }
        }
        catch
        {
            // Ignore malformed legacy JSON payloads and fall back to empty rows.
        }

        return new List<TvaInvoiceRow>();
    }

    private async Task<(bool hasConflict, IActionResult? response)> ValidateTvaInvoiceUniquenessAsync(FiscalDeclarationRequest request, int? excludedDeclarationId = null)
    {
        if (!IsTvaTab(request.TabKey))
            return (false, null);

        var incomingRows = ExtractTvaRows(request.TabKey, request.DataJson);
        if (incomingRows.Count == 0)
            return (false, null);

        // Prevent duplicates in the same payload.
        var incomingKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var row in incomingRows)
        {
            var key = BuildInvoiceComposite(row);
            if (string.IsNullOrWhiteSpace(key)) continue;

            if (!incomingKeys.Add(key))
            {
                return (true, Conflict(new
                {
                    message = "Facture en doublon dans la déclaration en cours (même fournisseur, même référence et même date).",
                    invoice = BuildInvoiceLabel(row)
                }));
            }
        }

        var existingQuery = _context.FiscalDeclarations
            .AsNoTracking()
            .Where(d => d.TabKey == "tva_immo" || d.TabKey == "tva_biens");

        if (excludedDeclarationId.HasValue)
            existingQuery = existingQuery.Where(d => d.Id != excludedDeclarationId.Value);

        var existingDeclarations = await existingQuery
            .Select(d => new { d.TabKey, d.DataJson })
            .ToListAsync();

        var existingKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var declaration in existingDeclarations)
        {
            foreach (var row in ExtractTvaRows(declaration.TabKey, declaration.DataJson))
            {
                var key = BuildInvoiceComposite(row);
                if (!string.IsNullOrWhiteSpace(key))
                    existingKeys.Add(key);
            }
        }

        foreach (var row in incomingRows)
        {
            var key = BuildInvoiceComposite(row);
            if (string.IsNullOrWhiteSpace(key)) continue;

            if (existingKeys.Contains(key))
            {
                return (true, Conflict(new
                {
                    message = "Facture déjà enregistrée dans les tableaux 2/3 (même fournisseur, même référence, même date), même sur une période différente.",
                    invoice = BuildInvoiceLabel(row)
                }));
            }
        }

        return (false, null);
    }

    // ─── GET api/fiscal ───────────────────────────────────────────────────────
    // Retourne toutes les déclarations de l'utilisateur connecté
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? tabKey, [FromQuery] string? mois, [FromQuery] string? annee)
    {
        var userId = GetCurrentUserId();
        var query = _context.FiscalDeclarations.Where(d => d.UserId == userId);

        if (!string.IsNullOrEmpty(tabKey))
            query = query.Where(d => d.TabKey == tabKey);
        if (!string.IsNullOrEmpty(mois))
            query = query.Where(d => d.Mois == mois);
        if (!string.IsNullOrEmpty(annee))
            query = query.Where(d => d.Annee == annee);

        var declarations = await query
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => new
            {
                d.Id, d.TabKey, d.Mois, d.Annee, d.Direction,
                d.DataJson, d.CreatedAt, d.UpdatedAt
            })
            .ToListAsync();

        return Ok(declarations);
    }

    // ─── GET api/fiscal/{id} ─────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetCurrentUserId();
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        return Ok(new
        {
            decl.Id, decl.TabKey, decl.Mois, decl.Annee, decl.Direction,
            decl.DataJson, decl.CreatedAt, decl.UpdatedAt
        });
    }

    // ─── POST api/fiscal ─────────────────────────────────────────────────────
    // Crée une nouvelle déclaration
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FiscalDeclarationRequest request)
    {
        var userId = GetCurrentUserId();

        var duplicateCheck = await ValidateTvaInvoiceUniquenessAsync(request);
        if (duplicateCheck.hasConflict && duplicateCheck.response != null)
            return duplicateCheck.response;

        var decl = new FiscalDeclaration
        {
            UserId    = userId,
            TabKey    = request.TabKey,
            Mois      = request.Mois,
            Annee     = request.Annee,
            Direction = request.Direction ?? "",
            DataJson  = request.DataJson ?? "{}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.FiscalDeclarations.Add(decl);
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_SAVE", "FiscalDeclaration", decl.Id,
            new { decl.TabKey, decl.Mois, decl.Annee, action = "create" });

        return CreatedAtAction(nameof(GetById), new { id = decl.Id },
            new { decl.Id, decl.TabKey, decl.Mois, decl.Annee, decl.CreatedAt });
    }

    // ─── PUT api/fiscal/{id} ─────────────────────────────────────────────────
    // Met à jour une déclaration existante
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] FiscalDeclarationRequest request)
    {
        var userId = GetCurrentUserId();
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        var duplicateCheck = await ValidateTvaInvoiceUniquenessAsync(request, id);
        if (duplicateCheck.hasConflict && duplicateCheck.response != null)
            return duplicateCheck.response;

        decl.TabKey    = request.TabKey;
        decl.Mois      = request.Mois;
        decl.Annee     = request.Annee;
        decl.Direction = request.Direction ?? decl.Direction;
        decl.DataJson  = request.DataJson ?? decl.DataJson;
        decl.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_SAVE", "FiscalDeclaration", decl.Id,
            new { decl.TabKey, decl.Mois, decl.Annee, action = "update" });

        return NoContent();
    }

    // ─── DELETE api/fiscal/{id} ──────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        var info = new { decl.TabKey, decl.Mois, decl.Annee };
        _context.FiscalDeclarations.Remove(decl);
        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_DELETE", "FiscalDeclaration", id, info);

        return NoContent();
    }

    // ─── POST api/fiscal/{id}/print ──────────────────────────────────────────
    // Enregistre un événement d'impression dans l'audit (pas de modification des données)
    [HttpPost("{id}/print")]
    public async Task<IActionResult> LogPrint(int id)
    {
        var userId = GetCurrentUserId();
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        await _auditService.LogAction(userId, "FISCAL_PRINT", "FiscalDeclaration", id,
            new { decl.TabKey, decl.Mois, decl.Annee });

        return Ok(new { message = "Impression enregistrée dans l'audit." });
    }
}

// ─── DTO ─────────────────────────────────────────────────────────────────────
public class FiscalDeclarationRequest
{
    public string TabKey    { get; set; } = "";
    public string Mois      { get; set; } = "";
    public string Annee     { get; set; } = "";
    public string? Direction { get; set; }
    public string? DataJson  { get; set; }
}

public sealed class TvaInvoiceRow
{
    public string? FournisseurId { get; set; }
    public string? NomRaisonSociale { get; set; }
    public string? NumFacture { get; set; }
    public string? DateFacture { get; set; }
}

public sealed class TvaImmoPayload
{
    public List<TvaInvoiceRow> TvaImmoRows { get; set; } = new();
}

public sealed class TvaBiensPayload
{
    public List<TvaInvoiceRow> TvaBiensRows { get; set; } = new();
}
