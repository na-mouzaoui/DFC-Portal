using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace CheckFillingAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;

    public AdminController(AppDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    private async Task<bool> IsAdmin()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);
        return user?.Role == "admin";
    }

    // GET: api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        if (!await IsAdmin())
            return Forbid();

        var users = await _context.Users
            .Where(u => u.Role != "admin") // Un admin ne peut pas voir les autres admins
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Direction,
                u.PhoneNumber,
                u.Role,
                u.Region,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/admin/users/{id}
    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        if (!await IsAdmin())
            return Forbid();

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        // Un admin ne peut pas consulter d'autres comptes admin
        if (user.Role == "admin")
            return Forbid();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Direction,
            user.PhoneNumber,
            user.Role,
            user.Region,
            user.CreatedAt
        });
    }

    // POST: api/admin/users
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!await IsAdmin())
            return Forbid();

        // Validation
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email et mot de passe requis");

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            return BadRequest("Cet email existe déjà");

        if (!Regex.IsMatch((request.PhoneNumber ?? string.Empty).Trim(), @"^0\d{9}$"))
            return BadRequest("Le numéro de téléphone doit commencer par 0 et contenir exactement 10 chiffres");

        if (request.Role == "regionale" && string.IsNullOrWhiteSpace(request.Region))
            return BadRequest("La région est requise pour le rôle régionale");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Direction = request.Direction,
            PhoneNumber = request.PhoneNumber,
            Role = request.Role,
            Region = request.Role == "regionale" ? request.Region : null,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Audit log
        await _auditService.LogAction(
            GetCurrentUserId(),
            "CREATE_USER",
            "User",
            user.Id,
            new { user.Email, user.Role, user.Region }
        );

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Direction,
            user.PhoneNumber,
            user.Role,
            user.Region,
            user.CreatedAt
        });
    }

    // PUT: api/admin/users/{id}
    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        if (!await IsAdmin())
            return Forbid();

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        // Un admin ne peut pas modifier un autre compte admin
        if (user.Role == "admin")
            return Forbid();

        var oldValues = new { user.FirstName, user.LastName, user.Direction, user.PhoneNumber, user.Role, user.Region };

        if (!string.IsNullOrWhiteSpace(request.FirstName))
            user.FirstName = request.FirstName;
        if (!string.IsNullOrWhiteSpace(request.LastName))
            user.LastName = request.LastName;
        if (!string.IsNullOrWhiteSpace(request.Direction))
            user.Direction = request.Direction;
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            if (!Regex.IsMatch(request.PhoneNumber.Trim(), @"^0\d{9}$"))
                return BadRequest("Le numéro de téléphone doit commencer par 0 et contenir exactement 10 chiffres");
            user.PhoneNumber = request.PhoneNumber.Trim();
        }
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            user.Role = request.Role;
            if (request.Role == "regionale" && string.IsNullOrWhiteSpace(request.Region))
                return BadRequest("La région est requise pour le rôle régionale");
            user.Region = request.Role == "regionale" ? request.Region : null;
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();

        // Audit log
        await _auditService.LogAction(
            GetCurrentUserId(),
            "UPDATE_USER",
            "User",
            user.Id,
            new { OldValues = oldValues, NewValues = new { user.FirstName, user.LastName, user.Direction, user.PhoneNumber, user.Role, user.Region } }
        );

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Direction,
            user.PhoneNumber,
            user.Role,
            user.Region
        });
    }

    // DELETE: api/admin/users/{id}
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!await IsAdmin())
            return Forbid();

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        // Un admin ne peut pas supprimer un autre compte admin
        if (user.Role == "admin")
            return Forbid();

        var userInfo = new { user.Email, user.Role };

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        // Audit log
        await _auditService.LogAction(
            GetCurrentUserId(),
            "DELETE_USER",
            "User",
            id,
            userInfo
        );

        return NoContent();
    }

    // POST: api/admin/users/{id}/reset-password
    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(int id)
    {
        if (!await IsAdmin())
            return Forbid();

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        // Un admin ne peut pas réinitialiser le mot de passe d'un autre admin
        if (user.Role == "admin")
            return Forbid();

        var oldEmail = user.Email;
        
        // Réinitialiser le mot de passe à "123456789"
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456789");
        await _context.SaveChangesAsync();

        // Audit log
        await _auditService.LogAction(
            GetCurrentUserId(),
            "RESET_PASSWORD",
            "User",
            id,
            new { UserEmail = oldEmail, NewPassword = "123456789" }
        );

        return Ok(new { message = "Mot de passe réinitialisé à 123456789" });
    }

    // GET: api/admin/audit-logs
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId, 
        [FromQuery] string? action,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        if (!await IsAdmin())
            return Forbid();

        var logs = await _auditService.GetAuditLogs(userId, action, from, to);

        return Ok(logs.Select(l => new
        {
            l.Id,
            l.UserId,
            UserEmail = l.User.Email,
            UserName = $"{l.User.FirstName} {l.User.LastName}",
            l.Action,
            l.EntityType,
            l.EntityId,
            l.Details,
            l.CreatedAt
        }));
    }
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Role { get; set; } = "comptabilite";
    public string? Region { get; set; }
}

public class UpdateUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Direction { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
    public string? Region { get; set; }
    public string? Password { get; set; }
}
