using Microsoft.EntityFrameworkCore;
using CheckFillingAPI.Models;

namespace CheckFillingAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Check> Checks { get; set; }
    public DbSet<Bank> Banks { get; set; }
    public DbSet<Region> Regions { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Checkbook> Checkbooks { get; set; }
    public DbSet<UserBankCalibration> UserBankCalibrations { get; set; }
    public DbSet<FiscalPeriode> Periodes { get; set; }
    public DbSet<FiscalDeclarationHeader> FiscalDeclarationHeaders { get; set; }
    public DbSet<FiscalDeclarationPayload> FiscalDeclarationPayloads { get; set; }
    public DbSet<FiscalFournisseur> FiscalFournisseurs { get; set; }
    public DbSet<Recap> Recaps { get; set; }
    public DbSet<AdminFiscalSetting> AdminFiscalSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.IsRegionalApprover).HasDefaultValue(false);
            entity.Property(e => e.IsFinanceApprover).HasDefaultValue(false);
        });

        // Check configuration
        modelBuilder.Entity<Check>(entity =>
        {
            entity.HasKey(e => e.Reference);
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status).HasDefaultValue("emit");
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Checks)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Checkbook)
                  .WithMany()
                  .HasForeignKey(e => e.CheckbookId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.CheckbookId);
        });

        // Bank configuration
        modelBuilder.Entity<Bank>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired();
            entity.Property(e => e.Name).IsRequired();
        });

        // Region configuration
        modelBuilder.Entity<Region>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).IsRequired();
        });

        // AuditLog configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.AuditLogs)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Action);
        });

        // Checkbook configuration
        modelBuilder.Entity<Checkbook>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Bank)
                  .WithMany()
                  .HasForeignKey(e => e.BankId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Serie).HasMaxLength(2).IsRequired();
            entity.HasIndex(e => new { e.BankId, e.Serie, e.StartNumber }).IsUnique();
        });

        // Supplier configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.CompanyType).IsRequired();
            entity.HasIndex(e => e.Name);
        });

        // UserBankCalibration configuration
        modelBuilder.Entity<UserBankCalibration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Bank)
                  .WithMany()
                  .HasForeignKey(e => e.BankId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.UserId, e.BankId }).IsUnique();
            entity.Property(e => e.PositionsJson).IsRequired();
        });

        // FiscalFournisseur configuration
        modelBuilder.Entity<FiscalFournisseur>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.RaisonSociale).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Adresse).HasMaxLength(500);
            entity.Property(e => e.AuthNIF).HasMaxLength(150);
            entity.Property(e => e.RC).HasMaxLength(100);
            entity.Property(e => e.AuthRC).HasMaxLength(150);
            entity.Property(e => e.NIF).HasMaxLength(100);
            entity.HasIndex(e => e.UserId);
        });

        // Periode configuration (normalized fiscal schema V2)
        modelBuilder.Entity<FiscalPeriode>(entity =>
        {
            entity.ToTable("Periode");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Mois, e.Annee })
                .IsUnique()
                .HasDatabaseName("UX_Periode_Mois_Annee");
        });

        // Declaration header configuration (normalized fiscal schema V2)
        modelBuilder.Entity<FiscalDeclarationHeader>(entity =>
        {
            entity.ToTable("Declaration", t => t.HasCheckConstraint("CK_Declaration_Statut", "[Statut] IN ('PENDING', 'APPROVED')"));
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Periode)
                .WithMany(p => p.Declarations)
                .HasForeignKey(e => e.PeriodeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Declaration_Periode");

            entity.Property(e => e.Direction).HasMaxLength(120).IsRequired();
            entity.Property(e => e.TableauCode).HasMaxLength(30).IsRequired();
            entity.Property(e => e.SupplierScopeKey).HasMaxLength(64).IsRequired().HasDefaultValue(string.Empty);
            entity.Property(e => e.Statut).HasMaxLength(20).IsRequired().HasDefaultValue("PENDING");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(e => e.RowVersion).IsRowVersion().IsConcurrencyToken();

            entity.HasIndex(e => new { e.PeriodeId, e.Direction, e.TableauCode, e.SupplierScopeKey })
                .IsUnique()
                .HasDatabaseName("UX_Declaration_Periode_Direction_Tableau_SupplierScope");
            entity.HasIndex(e => e.PeriodeId)
                .HasDatabaseName("IX_Declaration_Periode");
            entity.HasIndex(e => new { e.PeriodeId, e.Statut, e.Direction })
                .HasDatabaseName("IX_Declaration_Worklist");
        });

        modelBuilder.Entity<FiscalDeclarationPayload>(entity =>
        {
            entity.ToTable("DeclarationPayload");
            entity.HasKey(e => e.DeclarationId);

            entity.Property(e => e.DataJson).IsRequired();
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

            entity.HasOne(e => e.Declaration)
                .WithOne(d => d.Payload)
                .HasForeignKey<FiscalDeclarationPayload>(e => e.DeclarationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_DeclarationPayload_Declaration");
        });

        // Recap registry configuration
        modelBuilder.Entity<Recap>(entity =>
        {
            entity.ToTable("Recap");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.Key, e.Mois, e.Annee, e.Direction })
                .IsUnique()
                .HasDatabaseName("UX_Recap_Key_Mois_Annee_Direction");
            entity.Property(e => e.Key).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Mois).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Annee).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Direction).HasMaxLength(200).IsRequired();
            entity.Property(e => e.FormulasJson).IsRequired();
            entity.Property(e => e.IsGenerated).HasDefaultValue(true);
        });

        // AdminFiscalSetting configuration
        modelBuilder.Entity<AdminFiscalSetting>(entity =>
        {
            entity.ToTable("AdminFiscalSettings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IsTable6Enabled).HasDefaultValue(true);
        });

        // Seed data
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Tous les utilisateurs ont le même mot de passe: 
        var seedCreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Hash BCrypt pour ""
        const string passwordHash = "$2a$11$3f1y0aSd2iVFhKoWi60oVuwBiNQb913o5x94e0pYXB9eaqvHXW1By";

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Email = "test@gmail.com",
                PasswordHash = passwordHash,
                FirstName = "Test",
                LastName = "User",
                Direction = "Test",
                PhoneNumber = "0661000000",
                Role = "admin",
                CreatedAt = seedCreatedAt
            },
            new User
            {
                Id = 2,
                Email = "admin@test.com",
                PasswordHash = passwordHash,
                FirstName = "Admin",
                LastName = "Test",
                Direction = "Administration",
                PhoneNumber = "0661999999",
                Role = "admin",
                CreatedAt = seedCreatedAt
            },
            new User
            {
                Id = 3,
                Email = "admin@gmail.com",
                PasswordHash = passwordHash,
                FirstName = "Admin",
                LastName = "Gmail",
                Direction = "Administration",
                PhoneNumber = "0661999998",
                Role = "admin",
                CreatedAt = seedCreatedAt
            }
        );

        // Seed default banks
        var defaultPositions = System.Text.Json.JsonSerializer.Serialize(new BankPositions
        {
            City = new FieldPosition { X = 50, Y = 100, Width = 150, FontSize = 14 },
            Date = new FieldPosition { X = 400, Y = 100, Width = 150, FontSize = 14 },
            Payee = new FieldPosition { X = 120, Y = 180, Width = 400, FontSize = 14 },
            AmountInWords = new FieldPosition { X = 120, Y = 240, Width = 500, FontSize = 12 },
            Amount = new FieldPosition { X = 450, Y = 300, Width = 150, FontSize = 18 }
        });

        modelBuilder.Entity<Bank>().HasData(
            new Bank { Id = 1, Code = "BNA", Name = "BNA - Banque Nationale d'Algérie", PositionsJson = defaultPositions, CreatedAt = seedCreatedAt },
            new Bank { Id = 2, Code = "CPA", Name = "CPA - Crédit Populaire d'Algérie", PositionsJson = defaultPositions, CreatedAt = seedCreatedAt },
            new Bank { Id = 3, Code = "BEA", Name = "BEA - Banque Extérieure d'Algérie", PositionsJson = defaultPositions, CreatedAt = seedCreatedAt }
        );

        // Seed default regions
        modelBuilder.Entity<Region>().HasData(
            new Region { Id = 1, Name = "nord", VillesJson = "[\"Alger\", \"Tipaza\", \"Boumerdes\", \"Blida\", \"Ain Defla\"]", CreatedAt = seedCreatedAt },
            new Region { Id = 2, Name = "sud", VillesJson = "[\"Ouargla\", \"Ghardaia\", \"Tamanrasset\", \"Adrar\", \"Illizi\"]", CreatedAt = seedCreatedAt },
            new Region { Id = 3, Name = "est", VillesJson = "[\"Constantine\", \"Annaba\", \"Sétif\", \"Batna\", \"Guelma\"]", CreatedAt = seedCreatedAt },
            new Region { Id = 4, Name = "ouest", VillesJson = "[\"Oran\", \"Tlemcen\", \"Sidi Bel Abbès\", \"Mostaganem\", \"Mascara\"]", CreatedAt = seedCreatedAt }
        );

        modelBuilder.Entity<AdminFiscalSetting>().HasData(
            new AdminFiscalSetting
            {
                Id = 1,
                IsTable6Enabled = true,
                UpdatedAt = seedCreatedAt
            }
        );
    }
}

