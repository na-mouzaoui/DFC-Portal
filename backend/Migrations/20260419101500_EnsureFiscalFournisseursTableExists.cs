using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419101500_EnsureFiscalFournisseursTableExists")]
    public partial class EnsureFiscalFournisseursTableExists : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
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

IF COL_LENGTH(N'dbo.FiscalFournisseurs', N'Adresse') IS NULL
BEGIN
    ALTER TABLE [dbo].[FiscalFournisseurs]
    ADD [Adresse] NVARCHAR(500) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_Adresse_Fix] DEFAULT (N'');
END

IF COL_LENGTH(N'dbo.FiscalFournisseurs', N'AuthNIF') IS NULL
BEGIN
    ALTER TABLE [dbo].[FiscalFournisseurs]
    ADD [AuthNIF] NVARCHAR(150) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_AuthNIF_Fix] DEFAULT (N'');
END

IF COL_LENGTH(N'dbo.FiscalFournisseurs', N'AuthRC') IS NULL
BEGIN
    ALTER TABLE [dbo].[FiscalFournisseurs]
    ADD [AuthRC] NVARCHAR(150) NOT NULL CONSTRAINT [DF_FiscalFournisseurs_AuthRC_Fix] DEFAULT (N'');
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_FiscalFournisseurs_UserId'
      AND object_id = OBJECT_ID(N'[dbo].[FiscalFournisseurs]')
)
BEGIN
    CREATE INDEX [IX_FiscalFournisseurs_UserId] ON [dbo].[FiscalFournisseurs] ([UserId]);
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_FiscalFournisseurs_Users_UserId'
)
BEGIN
    ALTER TABLE [dbo].[FiscalFournisseurs] WITH CHECK
    ADD CONSTRAINT [FK_FiscalFournisseurs_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
        ON DELETE CASCADE;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[FiscalFournisseurs]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[FiscalFournisseurs];
END
");
        }
    }
}
