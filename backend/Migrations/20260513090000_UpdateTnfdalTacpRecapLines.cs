using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260513090000_UpdateTnfdalTacpRecapLines")]
    public partial class UpdateTnfdalTacpRecapLines : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* TNFDAL1 lignes updates */
IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TNFDAL];
END

IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TNFDAL1_lignes];
    INSERT INTO [dbo].[TNFDAL1_lignes] ([designiation]) VALUES
        (N'Direction Generale'),
        (N'DR Alger'),
        (N'DR Setif'),
        (N'DR Constantine'),
        (N'DR Annaba'),
        (N'DR Chlef'),
        (N'DR Oran'),
        (N'DR Bechar'),
        (N'DR Ouargla'),
        (N'Total');
END

/* TACP7 lignes updates */
IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TACP7];
END

IF OBJECT_ID(N'[dbo].[TACP7_lignes]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TACP7_lignes];
    INSERT INTO [dbo].[TACP7_lignes] ([designiation]) VALUES
        (N'Masters'),
        (N'Mobiposte'),
        (N'Racimo'),
        (N'Algerie Poste'),
        (N'DR Alger'),
        (N'DR Setif'),
        (N'DR Constantine'),
        (N'DR Annaba'),
        (N'DR Chlef'),
        (N'DR Oran'),
        (N'DR Bechar'),
        (N'DR Ouargla'),
        (N'Total');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TNFDAL];
END

IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TNFDAL1_lignes];
    INSERT INTO [dbo].[TNFDAL1_lignes] ([designiation]) VALUES
        (N'Direction Generale'),
        (N'Total');
END

IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TACP7];
END

IF OBJECT_ID(N'[dbo].[TACP7_lignes]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TACP7_lignes];
    INSERT INTO [dbo].[TACP7_lignes] ([designiation]) VALUES
        (N'Masters'),
        (N'Mobiposte'),
        (N'Racimo'),
        (N'Algerie Poste'),
        (N'Total');
END
");
        }
    }
}
