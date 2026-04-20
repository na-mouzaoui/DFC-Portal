using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419195500_RemovePayloadAndLegacyFiscalSettings")]
    public partial class RemovePayloadAndLegacyFiscalSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.AcompteProvisionel', N'MonthIndex') IS NULL
BEGIN
    ALTER TABLE [dbo].[AcompteProvisionel]
    ADD [MonthIndex] INT NULL;
END

IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_AcompteProvisionel_PeriodeId_MonthIndex'
      AND object_id = OBJECT_ID(N'[dbo].[AcompteProvisionel]')
)
BEGIN
    CREATE INDEX [IX_AcompteProvisionel_PeriodeId_MonthIndex]
        ON [dbo].[AcompteProvisionel]([PeriodeId], [MonthIndex]);
END

IF OBJECT_ID(N'[dbo].[FiscalFournisseurs]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Fournisseur]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[Fournisseur] ([Nom], [EstEtranger], [NIF], [RC], [Adresse])
    SELECT
        NULLIF(LTRIM(RTRIM([RaisonSociale])), N''),
        1,
        NULLIF(LTRIM(RTRIM([NIF])), N''),
        NULLIF(LTRIM(RTRIM([RC])), N''),
        NULLIF(LTRIM(RTRIM([Adresse])), N'')
    FROM [dbo].[FiscalFournisseurs] ff
    WHERE NULLIF(LTRIM(RTRIM(ff.[RaisonSociale])), N'') IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[Fournisseur] f
          WHERE f.[Nom] = NULLIF(LTRIM(RTRIM(ff.[RaisonSociale])), N'')
            AND ISNULL(f.[NIF], N'') = ISNULL(NULLIF(LTRIM(RTRIM(ff.[NIF])), N''), N'')
            AND ISNULL(f.[Adresse], N'') = ISNULL(NULLIF(LTRIM(RTRIM(ff.[Adresse])), N''), N'')
      );
END

IF OBJECT_ID(N'[dbo].[DeclarationPayload]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[DeclarationPayload];
END

IF OBJECT_ID(N'[dbo].[FiscalFournisseurs]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[FiscalFournisseurs];
END

IF OBJECT_ID(N'[dbo].[AdminFiscalSettings]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[AdminFiscalSettings];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[AdminFiscalSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AdminFiscalSettings] (
        [Id] INT NOT NULL,
        [IsTable6Enabled] BIT NOT NULL CONSTRAINT [DF_AdminFiscalSettings_IsTable6Enabled] DEFAULT(1),
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_AdminFiscalSettings] PRIMARY KEY ([Id])
    );

    INSERT INTO [dbo].[AdminFiscalSettings] ([Id], [IsTable6Enabled], [UpdatedAt])
    VALUES (1, 1, SYSUTCDATETIME());
END

IF OBJECT_ID(N'[dbo].[FiscalFournisseurs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[FiscalFournisseurs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] INT NOT NULL,
        [RaisonSociale] NVARCHAR(300) NOT NULL,
        [Adresse] NVARCHAR(500) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_Adresse] DEFAULT (N''),
        [AuthNIF] NVARCHAR(150) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_AuthNIF] DEFAULT (N''),
        [RC] NVARCHAR(100) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_RC] DEFAULT (N''),
        [AuthRC] NVARCHAR(150) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_AuthRC] DEFAULT (N''),
        [NIF] NVARCHAR(100) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_NIF] DEFAULT (N''),
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_FiscalFournisseurs_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_FiscalFournisseurs_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_FiscalFournisseurs] PRIMARY KEY ([Id])
    );
END

IF OBJECT_ID(N'[dbo].[DeclarationPayload]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DeclarationPayload] (
        [DeclarationId] INT NOT NULL,
        [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationPayload_DataJson] DEFAULT (N'{}'),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationPayload_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DeclarationPayload] PRIMARY KEY ([DeclarationId])
    );
END

IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NOT NULL
AND EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_AcompteProvisionel_PeriodeId_MonthIndex'
      AND object_id = OBJECT_ID(N'[dbo].[AcompteProvisionel]')
)
BEGIN
    DROP INDEX [IX_AcompteProvisionel_PeriodeId_MonthIndex] ON [dbo].[AcompteProvisionel];
END

IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.AcompteProvisionel', N'MonthIndex') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[AcompteProvisionel] DROP COLUMN [MonthIndex];
END
");
        }
    }
}
