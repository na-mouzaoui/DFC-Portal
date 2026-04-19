using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416224500_ReapplyFiscalNormalizedDeclarationV2")]
    public partial class ReapplyFiscalNormalizedDeclarationV2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- 1) Move current runtime declaration table to DeclarationLegacy when needed.
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'UserId') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
    BEGIN
        EXEC sp_rename N'dbo.Declaration', N'DeclarationLegacy';
    END
    ELSE
    BEGIN
        IF COL_LENGTH(N'dbo.DeclarationLegacy', N'DataJson') IS NULL
        BEGIN
            ALTER TABLE [dbo].[DeclarationLegacy]
            ADD [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationLegacy_DataJson] DEFAULT (N'{}');
        END

        SET IDENTITY_INSERT [dbo].[DeclarationLegacy] ON;
        INSERT INTO [dbo].[DeclarationLegacy]
            ([Id], [UserId], [TabKey], [Mois], [Annee], [Direction], [DataJson], [IsApproved], [ApprovedByUserId], [ApprovedAt], [CreatedAt], [UpdatedAt])
        SELECT
            [d].[Id], [d].[UserId], [d].[TabKey], [d].[Mois], [d].[Annee], [d].[Direction], N'{}', [d].[IsApproved], [d].[ApprovedByUserId], [d].[ApprovedAt], [d].[CreatedAt], [d].[UpdatedAt]
        FROM [dbo].[Declaration] AS [d]
        WHERE NOT EXISTS (
            SELECT 1
            FROM [dbo].[DeclarationLegacy] AS [l]
            WHERE [l].[Id] = [d].[Id]
        );
        SET IDENTITY_INSERT [dbo].[DeclarationLegacy] OFF;

        DROP TABLE [dbo].[Declaration];
    END
END

-- 2) Ensure DeclarationLegacy exists for runtime API compatibility.
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DeclarationLegacy] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] INT NOT NULL,
        [TabKey] NVARCHAR(50) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationLegacy_DataJson] DEFAULT (N'{}'),
        [IsApproved] BIT NOT NULL CONSTRAINT [DF_DeclarationLegacy_IsApproved] DEFAULT ((0)),
        [ApprovedByUserId] INT NULL,
        [ApprovedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationLegacy_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationLegacy_UpdatedAt] DEFAULT (SYSUTCDATETIME())
    );
END

IF COL_LENGTH(N'dbo.DeclarationLegacy', N'DataJson') IS NULL
BEGIN
    ALTER TABLE [dbo].[DeclarationLegacy]
    ADD [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationLegacy_DataJson] DEFAULT (N'{}');
END

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_DeclarationLegacy_Users_UserId'
      AND parent_object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    ALTER TABLE [dbo].[DeclarationLegacy]
    ADD CONSTRAINT [FK_DeclarationLegacy_Users_UserId]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]);
END

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_DeclarationLegacy_Users_ApprovedByUserId'
      AND parent_object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    ALTER TABLE [dbo].[DeclarationLegacy]
    ADD CONSTRAINT [FK_DeclarationLegacy_Users_ApprovedByUserId]
    FOREIGN KEY ([ApprovedByUserId]) REFERENCES [dbo].[Users]([Id]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DeclarationLegacy_UserId' AND object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    CREATE INDEX [IX_DeclarationLegacy_UserId] ON [dbo].[DeclarationLegacy]([UserId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DeclarationLegacy_UserId_TabKey_Mois_Annee' AND object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    CREATE INDEX [IX_DeclarationLegacy_UserId_TabKey_Mois_Annee]
    ON [dbo].[DeclarationLegacy]([UserId], [TabKey], [Mois], [Annee]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DeclarationLegacy_IsApproved' AND object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    CREATE INDEX [IX_DeclarationLegacy_IsApproved] ON [dbo].[DeclarationLegacy]([IsApproved]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DeclarationLegacy_ApprovedByUserId' AND object_id = OBJECT_ID(N'[dbo].[DeclarationLegacy]')
)
BEGIN
    CREATE INDEX [IX_DeclarationLegacy_ApprovedByUserId] ON [dbo].[DeclarationLegacy]([ApprovedByUserId]);
END

-- 3) Ensure Periode table exists for normalized Declaration V2.
IF OBJECT_ID(N'[dbo].[Periode]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Periode] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Mois] INT NOT NULL,
        [Annee] INT NOT NULL
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Periode_Mois_Annee' AND object_id = OBJECT_ID(N'[dbo].[Periode]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_Periode_Mois_Annee] ON [dbo].[Periode]([Mois], [Annee]);
END

-- 4) Rebuild normalized Declaration table if shape diverges from V2 target.
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND (
    COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'Direction') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'TableauCode') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'Statut') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'SubmittedAt') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'RowVersion') IS NULL
    OR COL_LENGTH(N'dbo.Declaration', N'LastModifiedByUserId') IS NOT NULL
    OR COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NOT NULL
)
BEGIN
    IF OBJECT_ID(N'[dbo].[Declaration_V2]', N'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Declaration_V2];
    END

    CREATE TABLE [dbo].[Declaration_V2] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [Direction] NVARCHAR(120) NOT NULL,
        [TableauCode] NVARCHAR(30) NOT NULL,
        [Statut] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Declaration_V2_Statut] DEFAULT (N'PENDING'),
        [SubmittedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_V2_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
        [RowVersion] ROWVERSION NOT NULL
    );

    IF COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'Direction') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'TableauCode') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'SubmittedAt') IS NOT NULL
    BEGIN
        EXEC(N'
            SET IDENTITY_INSERT [dbo].[Declaration_V2] ON;
            INSERT INTO [dbo].[Declaration_V2]
                ([Id], [PeriodeId], [Direction], [TableauCode], [Statut], [SubmittedAt])
            SELECT
                [Id],
                [PeriodeId],
                [Direction],
                [TableauCode],
                CASE WHEN UPPER([Statut]) = N''APPROVED'' THEN N''APPROVED'' ELSE N''PENDING'' END,
                [SubmittedAt]
            FROM [dbo].[Declaration];
            SET IDENTITY_INSERT [dbo].[Declaration_V2] OFF;
        ');
    END

    DROP TABLE [dbo].[Declaration];
    EXEC sp_rename N'dbo.Declaration_V2', N'Declaration';
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Declaration] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [Direction] NVARCHAR(120) NOT NULL,
        [TableauCode] NVARCHAR(30) NOT NULL,
        [Statut] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Declaration_Statut] DEFAULT (N'PENDING'),
        [SubmittedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
        [RowVersion] ROWVERSION NOT NULL
    );
END
");

            migrationBuilder.Sql(@"
-- 5) Ensure normalized Declaration constraints and indexes.
IF OBJECT_ID(N'[dbo].[Periode]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_Declaration_Periode'
      AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'ALTER TABLE [dbo].[Declaration] ADD CONSTRAINT [FK_Declaration_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]);');
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Declaration_Statut'
      AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'ALTER TABLE [dbo].[Declaration] ADD CONSTRAINT [CK_Declaration_Statut] CHECK ([Statut] IN (N''PENDING'', N''APPROVED''));');
END

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_LastModifiedBy' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'DROP INDEX [IX_Declaration_LastModifiedBy] ON [dbo].[Declaration];');
END

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_ApprovedBy' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'DROP INDEX [IX_Declaration_ApprovedBy] ON [dbo].[Declaration];');
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Direction') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'TableauCode') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Declaration_Periode_Direction_Tableau' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_Declaration_Periode_Direction_Tableau] ON [dbo].[Declaration]([PeriodeId], [Direction], [TableauCode]);');
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_Periode' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'CREATE INDEX [IX_Declaration_Periode] ON [dbo].[Declaration]([PeriodeId]);');
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Direction') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_Worklist' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
BEGIN
    EXEC(N'CREATE INDEX [IX_Declaration_Worklist] ON [dbo].[Declaration]([PeriodeId], [Statut], [Direction]);');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- No destructive rollback for this data-shaping migration.
");
        }
    }
}
