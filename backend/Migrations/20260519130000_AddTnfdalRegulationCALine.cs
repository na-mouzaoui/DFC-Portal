using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260519130000_AddTnfdalRegulationCALine")]
    public partial class AddTnfdalRegulationCALine : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [dbo].[TNFDAL1_lignes] WHERE [designiation] = N'Régulation CA')
    BEGIN
        INSERT INTO [dbo].[TNFDAL1_lignes] ([designiation]) VALUES (N'Régulation CA');
    END
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[TNFDAL1_lignes] WHERE [designiation] = N'Régulation CA';
END
");
        }
    }
}
