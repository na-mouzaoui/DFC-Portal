using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416173000_RemoveDeclarationLegacyKeepDeclaration")]
    public partial class RemoveDeclarationLegacyKeepDeclaration : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- 1) If legacy table exists, make sure the final table name is [Declaration]
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
    AND COL_LENGTH(N'dbo.Declaration', N'DataJson') IS NULL
    BEGIN
        DROP TABLE [dbo].[Declaration];
    END

    IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NULL
    BEGIN
        EXEC sp_rename N'dbo.DeclarationLegacy', N'Declaration';
    END
END

-- 2) If [Declaration] is still in header shape, convert it to legacy app shape.
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'DataJson') IS NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[DeclarationHeaderBackup]', N'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[DeclarationHeaderBackup];
    END

    EXEC sp_rename N'dbo.Declaration', N'DeclarationHeaderBackup';

    CREATE TABLE [dbo].[Declaration] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] INT NOT NULL,
        [TabKey] NVARCHAR(50) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Declaration_DataJson] DEFAULT (N'{}'),
        [IsApproved] BIT NOT NULL CONSTRAINT [DF_Declaration_IsApproved] DEFAULT ((0)),
        [ApprovedByUserId] INT NULL,
        [ApprovedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_UpdatedAt] DEFAULT (SYSUTCDATETIME())
    );

    IF OBJECT_ID(N'[dbo].[Periode]', N'U') IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[Declaration]
            ([UserId], [TabKey], [Mois], [Annee], [Direction], [DataJson], [IsApproved], [ApprovedByUserId], [ApprovedAt], [CreatedAt], [UpdatedAt])
        SELECT
            ISNULL([h].[LastModifiedByUserId], 1),
            ISNULL([h].[TableauCode], N''),
            RIGHT(N'00' + CONVERT(NVARCHAR(2), ISNULL([p].[Mois], 1)), 2),
            CONVERT(NVARCHAR(10), ISNULL([p].[Annee], YEAR(SYSUTCDATETIME()))),
            ISNULL([h].[Direction], N''),
            N'{}',
            CASE WHEN UPPER(ISNULL([h].[Statut], N'')) = N'APPROVED' THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END,
            [h].[ApprovedByUserId],
            CASE WHEN UPPER(ISNULL([h].[Statut], N'')) = N'APPROVED' THEN [h].[SubmittedAt] ELSE NULL END,
            ISNULL([h].[SubmittedAt], SYSUTCDATETIME()),
            ISNULL([h].[SubmittedAt], SYSUTCDATETIME())
        FROM [dbo].[DeclarationHeaderBackup] AS [h]
        LEFT JOIN [dbo].[Periode] AS [p] ON [p].[Id] = [h].[PeriodeId];
    END

    DROP TABLE [dbo].[DeclarationHeaderBackup];
END

-- 3) Ensure final table has expected FK/indexes for app runtime
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

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_UserId' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_UserId] ON [dbo].[Declaration]([UserId]);
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_IsApproved' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_IsApproved] ON [dbo].[Declaration]([IsApproved]);
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_UserId_TabKey_Mois_Annee' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_UserId_TabKey_Mois_Annee]
        ON [dbo].[Declaration]([UserId], [TabKey], [Mois], [Annee]);
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_Declaration_ApprovedByUserId' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        CREATE INDEX [IX_Declaration_ApprovedByUserId] ON [dbo].[Declaration]([ApprovedByUserId]);
    END
END

-- 4) Remove legacy table name if still present
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[DeclarationLegacy];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
BEGIN
    EXEC sp_rename N'dbo.Declaration', N'DeclarationLegacy';
END
");
        }
    }
}
