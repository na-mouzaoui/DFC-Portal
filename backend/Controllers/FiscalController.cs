using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
