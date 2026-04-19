using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CheckFillingAPI.Data;
using CheckFillingAPI.Models;
using CheckFillingAPI.RealTime;
using CheckFillingAPI.Services;
using Microsoft.AspNetCore.SignalR;
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

    private static string NormalizeTabKey(string? tabKey) => (tabKey ?? "").Trim().ToLowerInvariant();

    private async Task<bool> IsTable6EnabledAsync()
    {
        var setting = await _context.AdminFiscalSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == 1);

        return setting?.IsTable6Enabled ?? true;
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
                Mois = d.Periode.Mois.ToString(),
                Annee = d.Periode.Annee.ToString(),
                Direction = d.Direction,
                Statut = d.Statut,
                SubmittedAt = d.SubmittedAt,
            });
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

        return Ok(visibleDeclarations.Select(d => new
        {
            d.Id,
            TabKey = d.TabKey,
            Mois = int.Parse(d.Mois).ToString("00"),
            Annee = d.Annee,
            d.Direction,
            DataJson = "{}",
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

        return Ok(new
        {
            declaration.Id,
            TabKey = declaration.TabKey,
            Mois = int.Parse(declaration.Mois).ToString("00"),
            Annee = declaration.Annee,
            declaration.Direction,
            DataJson = "{}",
            CreatedAt = declaration.SubmittedAt,
            UpdatedAt = declaration.SubmittedAt,
            UserId = 0,
            IsApproved = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase),
            ApprovedByUserId = (int?)null,
            ApprovedAt = string.Equals(declaration.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase) ? declaration.SubmittedAt : (DateTime?)null,
            Statut = declaration.Statut
        });
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

        var exists = await _context.FiscalDeclarationHeaders
            .AsNoTracking()
            .AnyAsync(d => d.PeriodeId == periode.Id
                && d.TableauCode.ToLower() == normalizedTabKey
                && d.Direction.ToLower() == targetDirection.ToLower());

        if (exists)
        {
            return Conflict(new
            {
                message = $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), cette direction et cette période ({normalizedMois}/{normalizedAnnee}).",
                isDoubloon = true
            });
        }

        var declaration = new FiscalDeclarationHeader
        {
            PeriodeId = periode.Id,
            Direction = targetDirection,
            TableauCode = normalizedTabKey,
            Statut = "PENDING",
            SubmittedAt = DateTime.UtcNow,
        };

        _context.FiscalDeclarationHeaders.Add(declaration);
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
        var targetPeriode = await GetOrCreatePeriodeAsync(normalizedMois, normalizedAnnee);

        var duplicateExists = await _context.FiscalDeclarationHeaders
            .AsNoTracking()
            .AnyAsync(d => d.Id != id
                && d.PeriodeId == targetPeriode.Id
                && d.TableauCode.ToLower() == normalizedTabKey
                && d.Direction.ToLower() == targetDirection.ToLower());

        if (duplicateExists)
        {
            return Conflict(new
            {
                message = $"Une déclaration existe déjà pour ce tableau ({request.TabKey}), cette direction et cette période ({normalizedMois}/{normalizedAnnee}).",
                isDoubloon = true
            });
        }

        declaration.PeriodeId = targetPeriode.Id;
        declaration.Direction = targetDirection;
        declaration.TableauCode = normalizedTabKey;
        declaration.Statut = "PENDING";
        declaration.SubmittedAt = DateTime.UtcNow;

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
        else if (currentUserRole is "finance" or "comptabilite" or "direction")
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
            .GroupBy(d => d.Direction.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Select(d => (TabKey: d.TabKey, IsApproved: string.Equals(d.Statut, "APPROVED", StringComparison.OrdinalIgnoreCase))).ToList(),
                StringComparer.OrdinalIgnoreCase);

        var reminders = new List<ReminderDto>();

        foreach (var direction in allAccessibleDirections)
        {
            var isSiegeDirection = IsHeadOfficeDirection(direction);
            var assignedTabs = (isSiegeDirection ? FinanceManageableTabOrder : RegionalManageableTabOrder)
                .Where(tab => isTable6Enabled || !string.Equals(tab, "etat_tap", StringComparison.OrdinalIgnoreCase))
                .ToArray();
            var roleForDeadline = isSiegeDirection ? "finance" : "regionale";

            if (!TryBuildPeriodDeadline(currentMonth, currentYear, roleForDeadline, out var deadline))
                continue;

            var deadlineEndOfDay = deadline.AddDays(1).Date;
            var daysUntilDeadline = (int)Math.Floor((deadlineEndOfDay - now).TotalDays);

            declarationsByDirectionMap.TryGetValue(direction, out var declarationsForDirection);
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
    public bool IsUrgent { get; set; }
}