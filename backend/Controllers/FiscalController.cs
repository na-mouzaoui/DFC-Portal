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

        return (
            normalizedRole,
            (userFromDatabase?.Direction ?? "").Trim(),
            (userFromDatabase?.Region ?? "").Trim()
        );
    }

    private static int GetDeadlineDayForRole(string? role)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();
        return normalizedRole is "admin" or "comptabilite" or "finance" ? 15 : 10;
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

    private static bool CanManageTabForRole(string role, string? tabKey)
    {
        var normalizedRole = (role ?? "").Trim().ToLowerInvariant();
        var normalizedTabKey = NormalizeTabKey(tabKey);

        if (string.IsNullOrWhiteSpace(normalizedTabKey)) return false;

        if (normalizedRole == "admin")
            return true;

        if (normalizedRole == "regionale")
            return RegionalManageableTabs.Contains(normalizedTabKey);

        if (normalizedRole is "comptabilite" or "finance")
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

        if (normalizedRole is "comptabilite" or "finance")
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

    // ─── GET api/fiscal/policy ─────────────────────────────────────────────
    // Expose la politique d'accès et la règle de clôture côté backend.
    [HttpGet("policy")]
    public async Task<IActionResult> GetPolicy([FromQuery] string? direction)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        var manageableTabKeys = GetManageableTabsForRoleAndDirection(currentUserRole, direction);

        return Ok(new
        {
            role = currentUserRole,
            requestedDirection = (direction ?? "").Trim(),
            deadlineDay = GetDeadlineDayForRole(currentUserRole),
            regionalTabKeys = RegionalManageableTabOrder,
            financeTabKeys = FinanceManageableTabOrder,
            manageableTabKeys,
            serverNow = DateTime.UtcNow,
        });
    }

    // ─── GET api/fiscal/period-lock ───────────────────────────────────────
    // Évalue le verrou de période depuis la règle backend.
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

    // ─── GET api/fiscal ───────────────────────────────────────────────────────
    // Retourne toutes les déclarations de l'utilisateur connecté
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? tabKey, [FromQuery] string? mois, [FromQuery] string? annee)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = (currentUserContext.Role ?? "").Trim().ToLowerInvariant();
        var currentUserRegion = (currentUserContext.Region ?? "").Trim().ToLowerInvariant();

        IQueryable<FiscalDeclaration> query = _context.FiscalDeclarations.AsNoTracking();

        // Le dashboard fiscal est piloté par une portée métier (profil + direction),
        // pas uniquement par l'auteur de la déclaration.
        if (currentUserRole == "admin")
        {
            // Admin voit toutes les déclarations, y compris celles émises par
            // les comptes admin, finance/comptabilite, direction et regionale.
        }
        else if (currentUserRole == "regionale")
        {
            if (string.IsNullOrWhiteSpace(currentUserRegion))
            {
                query = query.Where(d => d.UserId == userId);
            }
            else
            {
                query = query.Where(d =>
                    ((d.Direction ?? "").Trim().ToLower() == currentUserRegion)
                    || (
                        string.IsNullOrWhiteSpace(d.Direction)
                        && (d.User.Region ?? "").Trim().ToLower() == currentUserRegion
                    )
                );
            }
        }
        else if (currentUserRole is "finance" or "comptabilite")
        {
            // Finance voit:
            // 1) toutes les déclarations de la direction Siège (approuvées ou en attente)
            // 2) les déclarations régionales approuvées
            query = query.Where(d =>
                // Déclarations Siège
                (
                    ((d.Direction ?? "").Trim().ToLower() == "siège")
                    || ((d.Direction ?? "").Trim().ToLower() == "siege")
                    || ((d.Direction ?? "").Trim().ToLower().Contains("siège"))
                    || ((d.Direction ?? "").Trim().ToLower().Contains("siege"))
                    || (
                        string.IsNullOrWhiteSpace(d.Direction)
                        && (
                            (d.User.Role ?? "").Trim().ToLower() == "finance"
                            || (d.User.Role ?? "").Trim().ToLower() == "comptabilite"
                            || (d.User.Role ?? "").Trim().ToLower() == "admin"
                            || (d.User.Role ?? "").Trim().ToLower() == "direction"
                        )
                    )
                )
                // Déclarations régionales approuvées
                || (
                    (d.User.Role ?? "").Trim().ToLower() == "regionale"
                    && d.IsApproved
                )
            );
        }
        else if (currentUserRole == "direction")
        {
            // Global/Direction voit toutes les déclarations, toutes directions confondues,
            // mais uniquement celles approuvées.
            query = query.Where(d => d.IsApproved);
        }
        else
        {
            query = query.Where(d => d.UserId == userId);
        }

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
                d.DataJson, d.CreatedAt, d.UpdatedAt,
                d.UserId,
                d.IsApproved,
                d.ApprovedByUserId,
                d.ApprovedAt
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
            decl.DataJson, decl.CreatedAt, decl.UpdatedAt,
            decl.UserId,
            decl.IsApproved,
            decl.ApprovedByUserId,
            decl.ApprovedAt
        });
    }

    // ─── POST api/fiscal ─────────────────────────────────────────────────────
    // Crée une nouvelle déclaration
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FiscalDeclarationRequest request)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;

        if (!CanManageTabForRole(currentUserRole, request.TabKey))
            return BuildTabAccessDeniedResponse(currentUserRole, request.TabKey);

        if (IsPeriodLocked(request.Mois, request.Annee, currentUserRole, out var periodDeadline))
            return BuildPeriodLockedResponse(request.Mois, request.Annee, periodDeadline);

        var duplicateCheck = await ValidateTvaInvoiceUniquenessAsync(request);
        if (duplicateCheck.hasConflict && duplicateCheck.response != null)
            return duplicateCheck.response;

        var decl = new FiscalDeclaration
        {
            UserId    = userId,
            TabKey    = request.TabKey,
            Mois      = request.Mois,
            Annee     = request.Annee,
            Direction = ResolveDirectionForRole(currentUserRole, request.Direction, currentUserContext.Direction, currentUserContext.Region),
            DataJson  = request.DataJson ?? "{}",
            IsApproved = false,
            ApprovedByUserId = null,
            ApprovedAt = null,
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
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        if (!CanManageTabForRole(currentUserRole, decl.TabKey))
            return BuildTabAccessDeniedResponse(currentUserRole, decl.TabKey);

        if (!CanManageTabForRole(currentUserRole, request.TabKey))
            return BuildTabAccessDeniedResponse(currentUserRole, request.TabKey);

        if (IsPeriodLocked(decl.Mois, decl.Annee, currentUserRole, out var sourceDeadline))
            return BuildPeriodLockedResponse(decl.Mois, decl.Annee, sourceDeadline);

        if (IsPeriodLocked(request.Mois, request.Annee, currentUserRole, out var targetDeadline))
            return BuildPeriodLockedResponse(request.Mois, request.Annee, targetDeadline);

        var duplicateCheck = await ValidateTvaInvoiceUniquenessAsync(request, id);
        if (duplicateCheck.hasConflict && duplicateCheck.response != null)
            return duplicateCheck.response;

        decl.TabKey    = request.TabKey;
        decl.Mois      = request.Mois;
        decl.Annee     = request.Annee;
        decl.Direction = ResolveDirectionForRole(currentUserRole, request.Direction, currentUserContext.Direction, currentUserContext.Region, decl.Direction);
        decl.DataJson  = request.DataJson ?? decl.DataJson;
        // Toute modification remet la déclaration en attente d'approbation.
        decl.IsApproved = false;
        decl.ApprovedByUserId = null;
        decl.ApprovedAt = null;
        decl.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_SAVE", "FiscalDeclaration", decl.Id,
            new { decl.TabKey, decl.Mois, decl.Annee, action = "update" });

        return NoContent();
    }

    // ─── POST api/fiscal/{id}/approve ───────────────────────────────────────
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = (currentUserContext.Role ?? "").Trim().ToLowerInvariant();

        var approver = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (approver == null)
            return Unauthorized();

        var canApproveAsRegional = currentUserRole == "regionale" && approver.IsRegionalApprover;
        var canApproveAsFinance = (currentUserRole == "finance" || currentUserRole == "comptabilite") && approver.IsFinanceApprover;

        if (!canApproveAsRegional && !canApproveAsFinance)
            return StatusCode(403, new { message = "Ce compte n'a pas le droit d'approbation." });

        var approverRegion = (approver.Region ?? "").Trim().ToLowerInvariant();
        if (canApproveAsRegional && string.IsNullOrWhiteSpace(approverRegion))
            return BadRequest(new { message = "Le compte approbateur doit être rattaché à une région." });

        var decl = await _context.FiscalDeclarations
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (decl == null)
            return NotFound();

        if (decl.UserId == userId)
            return BadRequest(new { message = "Vous ne pouvez pas approuver votre propre déclaration." });

        var declarationOwnerRole = (decl.User.Role ?? "").Trim().ToLowerInvariant();
        var declarationOwnerRegion = (decl.User.Region ?? "").Trim().ToLowerInvariant();
        var declarationDirection = (decl.Direction ?? "").Trim().ToLowerInvariant();
        var isSiegeDeclaration = declarationDirection == "siège"
            || declarationDirection == "siege"
            || declarationDirection.Contains("siège")
            || declarationDirection.Contains("siege")
            || (string.IsNullOrWhiteSpace(decl.Direction)
                && (declarationOwnerRole == "finance"
                    || declarationOwnerRole == "comptabilite"
                    || declarationOwnerRole == "direction"
                    || declarationOwnerRole == "admin"));

        if (canApproveAsRegional && (declarationOwnerRole != "regionale" || declarationOwnerRegion != approverRegion))
        {
            return StatusCode(403, new
            {
                message = "Vous ne pouvez approuver que les déclarations d'autres utilisateurs de votre région."
            });
        }

        if (canApproveAsFinance && !isSiegeDeclaration)
        {
            return StatusCode(403, new
            {
                message = "Vous ne pouvez approuver que les déclarations du niveau Siège."
            });
        }

        if (decl.IsApproved)
        {
            return Ok(new
            {
                message = "Déclaration déjà approuvée.",
                decl.Id,
                decl.IsApproved,
                decl.ApprovedByUserId,
                decl.ApprovedAt
            });
        }

        decl.IsApproved = true;
        decl.ApprovedByUserId = userId;
        decl.ApprovedAt = DateTime.UtcNow;
        decl.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAction(userId, "FISCAL_APPROVE", "FiscalDeclaration", decl.Id,
            new { decl.TabKey, decl.Mois, decl.Annee, decl.UserId, approverRegion, approverRole = currentUserRole });

        return Ok(new
        {
            message = "Déclaration approuvée avec succès.",
            decl.Id,
            decl.IsApproved,
            decl.ApprovedByUserId,
            decl.ApprovedAt
        });
    }

    // ─── DELETE api/fiscal/{id} ──────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        var currentUserContext = await GetCurrentUserContextAsync(userId);
        var currentUserRole = currentUserContext.Role;
        var decl = await _context.FiscalDeclarations
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (decl == null) return NotFound();

        if (!CanManageTabForRole(currentUserRole, decl.TabKey))
            return BuildTabAccessDeniedResponse(currentUserRole, decl.TabKey);

        if (IsPeriodLocked(decl.Mois, decl.Annee, currentUserRole, out var periodDeadline))
            return BuildPeriodLockedResponse(decl.Mois, decl.Annee, periodDeadline);

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
