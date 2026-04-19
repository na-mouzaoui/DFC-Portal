using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416203000_KeepDeclarationNoJsonDropLegacy")]
    public partial class KeepDeclarationNoJsonDropLegacy : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- 1) Ensure [DeclarationLegacy] is removed and [Declaration] is the canonical table name.
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NULL
    BEGIN
        EXEC sp_rename N'dbo.DeclarationLegacy', N'Declaration';
    END
    ELSE
    BEGIN
        DROP TABLE [dbo].[DeclarationLegacy];
    END
END

-- 2) If [Declaration] still contains JSON payload column, rebuild it without DataJson.
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'DataJson') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[Declaration_NoJson]', N'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Declaration_NoJson];
    END

    CREATE TABLE [dbo].[Declaration_NoJson] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] INT NOT NULL,
        [TabKey] NVARCHAR(50) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [IsApproved] BIT NOT NULL CONSTRAINT [DF_Declaration_NoJson_IsApproved] DEFAULT ((0)),
        [ApprovedByUserId] INT NULL,
        [ApprovedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_NoJson_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_NoJson_UpdatedAt] DEFAULT (SYSUTCDATETIME())
    );

    SET IDENTITY_INSERT [dbo].[Declaration_NoJson] ON;
    INSERT INTO [dbo].[Declaration_NoJson]
        ([Id], [UserId], [TabKey], [Mois], [Annee], [Direction], [IsApproved], [ApprovedByUserId], [ApprovedAt], [CreatedAt], [UpdatedAt])
    SELECT
        [Id], [UserId], [TabKey], [Mois], [Annee], [Direction], [IsApproved], [ApprovedByUserId], [ApprovedAt], [CreatedAt], [UpdatedAt]
    FROM [dbo].[Declaration];
    SET IDENTITY_INSERT [dbo].[Declaration_NoJson] OFF;

    DROP TABLE [dbo].[Declaration];
    EXEC sp_rename N'dbo.Declaration_NoJson', N'Declaration';
END

-- 3) Ensure expected indexes and foreign keys exist for non-JSON declaration shape.
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.Declaration', N'UserId') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE name = N'FK_Declaration_Users_UserId'
          AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        ALTER TABLE [dbo].[Declaration]
        ADD CONSTRAINT [FK_Declaration_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE;
    END

    IF COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE name = N'FK_Declaration_Users_ApprovedByUserId'
          AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        ALTER TABLE [dbo].[Declaration]
        ADD CONSTRAINT [FK_Declaration_Users_ApprovedByUserId]
        FOREIGN KEY ([ApprovedByUserId]) REFERENCES [dbo].[Users]([Id]);
    END

    IF COL_LENGTH(N'dbo.Declaration', N'UserId') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_UserId' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_UserId] ON [dbo].[Declaration]([UserId]);
    END

    IF COL_LENGTH(N'dbo.Declaration', N'IsApproved') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_IsApproved' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_IsApproved] ON [dbo].[Declaration]([IsApproved]);
    END

    IF COL_LENGTH(N'dbo.Declaration', N'UserId') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'TabKey') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'Mois') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'Annee') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_UserId_TabKey_Mois_Annee' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_UserId_TabKey_Mois_Annee]
        ON [dbo].[Declaration]([UserId], [TabKey], [Mois], [Annee]);
    END

    IF COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_ApprovedByUserId' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_ApprovedByUserId] ON [dbo].[Declaration]([ApprovedByUserId]);
    END
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'DataJson') IS NULL
BEGIN
    ALTER TABLE [dbo].[Declaration]
    ADD [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Declaration_DataJson] DEFAULT (N'{}');
END
");
        }
    }
}
