using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419124500_AddDirectionToNormalizedFiscalTables")]
    public partial class AddDirectionToNormalizedFiscalTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Encaissement]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Encaissement', N'Direction') IS NULL
BEGIN
    ALTER TABLE [dbo].[Encaissement] ADD [Direction] NVARCHAR(120) NOT NULL CONSTRAINT [DF_Encaissement_Direction] DEFAULT(N'');
    CREATE INDEX [IX_Encaissement_PeriodeId_Direction] ON [dbo].[Encaissement]([PeriodeId], [Direction]);
END

IF OBJECT_ID(N'[dbo].[Tva]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tva', N'Direction') IS NULL
BEGIN
    ALTER TABLE [dbo].[Tva] ADD [Direction] NVARCHAR(120) NOT NULL CONSTRAINT [DF_Tva_Direction] DEFAULT(N'');
    CREATE INDEX [IX_Tva_PeriodeId_Direction_Type] ON [dbo].[Tva]([PeriodeId], [Direction], [Type]);
END

IF OBJECT_ID(N'[dbo].[Ca71]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Ca71', N'Direction') IS NULL
BEGIN
    ALTER TABLE [dbo].[Ca71] ADD [Direction] NVARCHAR(120) NOT NULL CONSTRAINT [DF_Ca71_Direction] DEFAULT(N'');
    CREATE INDEX [IX_Ca71_PeriodeId_Direction] ON [dbo].[Ca71]([PeriodeId], [Direction]);
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tap', N'Direction') IS NULL
BEGIN
    ALTER TABLE [dbo].[Tap] ADD [Direction] NVARCHAR(120) NOT NULL CONSTRAINT [DF_Tap_Direction] DEFAULT(N'');
    CREATE INDEX [IX_Tap_PeriodeId_Direction] ON [dbo].[Tap]([PeriodeId], [Direction]);
END

IF OBJECT_ID(N'[dbo].[Timbre]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Timbre', N'Direction') IS NULL
BEGIN
    ALTER TABLE [dbo].[Timbre] ADD [Direction] NVARCHAR(120) NOT NULL CONSTRAINT [DF_Timbre_Direction] DEFAULT(N'');
    CREATE INDEX [IX_Timbre_PeriodeId_Direction] ON [dbo].[Timbre]([PeriodeId], [Direction]);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Timbre]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Timbre', N'Direction') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Timbre_PeriodeId_Direction' AND object_id = OBJECT_ID(N'[dbo].[Timbre]'))
        DROP INDEX [IX_Timbre_PeriodeId_Direction] ON [dbo].[Timbre];
    ALTER TABLE [dbo].[Timbre] DROP CONSTRAINT [DF_Timbre_Direction];
    ALTER TABLE [dbo].[Timbre] DROP COLUMN [Direction];
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tap', N'Direction') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tap_PeriodeId_Direction' AND object_id = OBJECT_ID(N'[dbo].[Tap]'))
        DROP INDEX [IX_Tap_PeriodeId_Direction] ON [dbo].[Tap];
    ALTER TABLE [dbo].[Tap] DROP CONSTRAINT [DF_Tap_Direction];
    ALTER TABLE [dbo].[Tap] DROP COLUMN [Direction];
END

IF OBJECT_ID(N'[dbo].[Ca71]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Ca71', N'Direction') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Ca71_PeriodeId_Direction' AND object_id = OBJECT_ID(N'[dbo].[Ca71]'))
        DROP INDEX [IX_Ca71_PeriodeId_Direction] ON [dbo].[Ca71];
    ALTER TABLE [dbo].[Ca71] DROP CONSTRAINT [DF_Ca71_Direction];
    ALTER TABLE [dbo].[Ca71] DROP COLUMN [Direction];
END

IF OBJECT_ID(N'[dbo].[Tva]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tva', N'Direction') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tva_PeriodeId_Direction_Type' AND object_id = OBJECT_ID(N'[dbo].[Tva]'))
        DROP INDEX [IX_Tva_PeriodeId_Direction_Type] ON [dbo].[Tva];
    ALTER TABLE [dbo].[Tva] DROP CONSTRAINT [DF_Tva_Direction];
    ALTER TABLE [dbo].[Tva] DROP COLUMN [Direction];
END

IF OBJECT_ID(N'[dbo].[Encaissement]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Encaissement', N'Direction') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Encaissement_PeriodeId_Direction' AND object_id = OBJECT_ID(N'[dbo].[Encaissement]'))
        DROP INDEX [IX_Encaissement_PeriodeId_Direction] ON [dbo].[Encaissement];
    ALTER TABLE [dbo].[Encaissement] DROP CONSTRAINT [DF_Encaissement_Direction];
    ALTER TABLE [dbo].[Encaissement] DROP COLUMN [Direction];
END
");
        }
    }
}
