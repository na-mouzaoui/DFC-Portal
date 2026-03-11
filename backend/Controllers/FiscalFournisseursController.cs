using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/fiscal-fournisseurs")]
[Authorize]
public class FiscalFournisseursController : ControllerBase
{
    private readonly AppDbContext _context;

    public FiscalFournisseursController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    // GET api/fiscal-fournisseurs
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetCurrentUserId();
        var fournisseurs = await _context.FiscalFournisseurs
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.RaisonSociale)
            .Select(f => new {
                id = f.Id,
                raisonSociale = f.RaisonSociale,
                rc = f.RC,
                nif = f.NIF,
                createdAt = f.CreatedAt,
                updatedAt = f.UpdatedAt
            })
            .ToListAsync();
        return Ok(fournisseurs);
    }

    // POST api/fiscal-fournisseurs
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FiscalFournisseurDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RaisonSociale))
            return BadRequest(new { message = "La raison sociale est obligatoire." });

        var userId = GetCurrentUserId();

        var fournisseur = new FiscalFournisseur
        {
            UserId = userId,
            RaisonSociale = dto.RaisonSociale.Trim(),
            RC = dto.RC?.Trim() ?? string.Empty,
            NIF = dto.NIF?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.FiscalFournisseurs.Add(fournisseur);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = fournisseur.Id }, new {
            id = fournisseur.Id,
            raisonSociale = fournisseur.RaisonSociale,
            rc = fournisseur.RC,
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

        var userId = GetCurrentUserId();
        var fournisseur = await _context.FiscalFournisseurs
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

        if (fournisseur == null)
            return NotFound(new { message = "Fournisseur introuvable." });

        fournisseur.RaisonSociale = dto.RaisonSociale.Trim();
        fournisseur.RC = dto.RC?.Trim() ?? string.Empty;
        fournisseur.NIF = dto.NIF?.Trim() ?? string.Empty;
        fournisseur.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new {
            id = fournisseur.Id,
            raisonSociale = fournisseur.RaisonSociale,
            rc = fournisseur.RC,
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
        var fournisseur = await _context.FiscalFournisseurs
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

        if (fournisseur == null)
            return NotFound(new { message = "Fournisseur introuvable." });

        _context.FiscalFournisseurs.Remove(fournisseur);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class FiscalFournisseurDto
{
    public string RaisonSociale { get; set; } = string.Empty;
    public string? RC { get; set; }
    public string? NIF { get; set; }
}
