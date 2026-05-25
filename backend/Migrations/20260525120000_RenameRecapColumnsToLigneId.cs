using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525120000_RenameRecapColumnsToLigneId")]
    public partial class RenameRecapColumnsToLigneId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[G50]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.G50', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.G50', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[G50].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[G50Annuel]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.G50Annuel', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.G50Annuel', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[G50Annuel].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[MasterRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.MasterRecap', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.MasterRecap', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[MasterRecap].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TACP7', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TACP7', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TACP7].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TACP7_declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TACP7_declaration', N'id_designiation_TACP') IS NOT NULL
        AND COL_LENGTH(N'dbo.TACP7_declaration', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TACP7_declaration].[id_designiation_TACP]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TAPRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TAPRecap', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TAPRecap', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TAPRecap].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TimbreRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TimbreRecap', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TimbreRecap', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TimbreRecap].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TNFDAL', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TNFDAL', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TNFDAL].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TNFDAL1_declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TNFDAL1_declaration', N'id_designiation_TNFDAL') IS NOT NULL
        AND COL_LENGTH(N'dbo.TNFDAL1_declaration', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TNFDAL1_declaration].[id_designiation_TNFDAL]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVACollecte]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVACollecte', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVACollecte', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TVACollecte].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVADeductible]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVADeductible', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVADeductible', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TVADeductible].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVAPayer]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVAPayer', N'id_designiation_encaissement') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVAPayer', N'ligneId') IS NULL
        EXEC sp_rename N'[dbo].[TVAPayer].[id_designiation_encaissement]', N'ligneId', 'COLUMN';
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[G50]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.G50', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.G50', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[G50].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[G50Annuel]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.G50Annuel', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.G50Annuel', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[G50Annuel].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[MasterRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.MasterRecap', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.MasterRecap', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[MasterRecap].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TACP7', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TACP7', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TACP7].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TACP7_declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TACP7_declaration', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TACP7_declaration', N'id_designiation_TACP') IS NULL
        EXEC sp_rename N'[dbo].[TACP7_declaration].[ligneId]', N'id_designiation_TACP', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TAPRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TAPRecap', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TAPRecap', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TAPRecap].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TimbreRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TimbreRecap', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TimbreRecap', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TimbreRecap].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TNFDAL', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TNFDAL', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TNFDAL].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TNFDAL1_declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TNFDAL1_declaration', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TNFDAL1_declaration', N'id_designiation_TNFDAL') IS NULL
        EXEC sp_rename N'[dbo].[TNFDAL1_declaration].[ligneId]', N'id_designiation_TNFDAL', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVACollecte]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVACollecte', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVACollecte', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TVACollecte].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVADeductible]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVADeductible', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVADeductible', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TVADeductible].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END

IF OBJECT_ID(N'[dbo].[TVAPayer]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.TVAPayer', N'ligneId') IS NOT NULL
        AND COL_LENGTH(N'dbo.TVAPayer', N'id_designiation_encaissement') IS NULL
        EXEC sp_rename N'[dbo].[TVAPayer].[ligneId]', N'id_designiation_encaissement', 'COLUMN';
END
");
        }
    }
}
