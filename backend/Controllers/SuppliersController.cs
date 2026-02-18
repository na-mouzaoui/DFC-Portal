using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using System.Security.Claims;
using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace CheckFillingAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;
    private readonly IAuditService _auditService;
    private readonly AppDbContext _context;

    public SuppliersController(ISupplierService supplierService, IAuditService auditService, AppDbContext context)
    {
        _supplierService = supplierService;
        _auditService = auditService;
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supplier>>> GetAllSuppliers()
    {
        var suppliers = await _supplierService.GetAllSuppliersAsync();
        return Ok(suppliers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Supplier>> GetSupplier(int id)
    {
        var supplier = await _supplierService.GetSupplierByIdAsync(id);
        if (supplier == null)
            return NotFound(new { message = "Fournisseur introuvable" });
        
        return Ok(supplier);
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> CreateSupplier([FromBody] Supplier supplier)
    {
        var trimmedName = supplier.Name?.Trim();
        if (string.IsNullOrEmpty(trimmedName))
            return BadRequest(new { message = "Le nom du fournisseur est requis" });

        supplier.Name = trimmedName;

        if (await _supplierService.SupplierNameExistsAsync(trimmedName))
            return Conflict(new { message = "Un fournisseur avec ce nom existe déjà" });

        var created = await _supplierService.CreateSupplierAsync(supplier);

        var userId = GetCurrentUserId();
        await _auditService.LogAction(
            userId,
            "CREATE_SUPPLIER",
            "Supplier",
            created.Id,
            new { name = created.Name }
        );

        return CreatedAtAction(nameof(GetSupplier), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Supplier>> UpdateSupplier(int id, [FromBody] Supplier supplier)
    {
        var trimmedName = supplier.Name?.Trim();
        if (string.IsNullOrEmpty(trimmedName))
            return BadRequest(new { message = "Le nom du fournisseur est requis" });

        // Récupérer l'ancien nom avant la mise à jour
        var existingSupplier = await _supplierService.GetSupplierByIdAsync(id);
        if (existingSupplier == null)
            return NotFound(new { message = "Fournisseur introuvable" });

        var oldName = existingSupplier.Name;
        supplier.Name = trimmedName;

        if (await _supplierService.SupplierNameExistsAsync(trimmedName, id))
            return Conflict(new { message = "Un fournisseur avec ce nom existe déjà" });

        var updated = await _supplierService.UpdateSupplierAsync(id, supplier);
        if (updated == null)
            return NotFound(new { message = "Fournisseur introuvable" });

        // Mettre à jour tous les chèques qui utilisent l'ancien nom
        if (oldName != trimmedName)
        {
            var checksToUpdate = await _context.Checks
                .Where(c => c.Payee == oldName)
                .ToListAsync();

            foreach (var check in checksToUpdate)
            {
                check.Payee = trimmedName;
            }

            if (checksToUpdate.Any())
            {
                await _context.SaveChangesAsync();
            }
        }

        var userId = GetCurrentUserId();
        await _auditService.LogAction(
            userId,
            "UPDATE_SUPPLIER",
            "Supplier",
            updated.Id,
            new { oldName, newName = updated.Name, checksUpdated = oldName != trimmedName }
        );

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupplier(int id)
    {
        var supplier = await _supplierService.GetSupplierByIdAsync(id);
        if (supplier == null)
            return NotFound(new { message = "Fournisseur introuvable" });

        var success = await _supplierService.DeleteSupplierAsync(id);
        if (!success)
            return StatusCode(500, new { message = "Erreur lors de la suppression" });

        var userId = GetCurrentUserId();
        await _auditService.LogAction(
            userId,
            "DELETE_SUPPLIER",
            "Supplier",
            id,
            new { name = supplier.Name }
        );

        return NoContent();
    }
}
