using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260421161000_RemoveCommuneNomColumn")]
    public partial class RemoveCommuneNomColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Commune', 'Nom') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Commune] DROP COLUMN [Nom];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.Commune', 'Nom') IS NULL
BEGIN
    ALTER TABLE [dbo].[Commune] ADD [Nom] NVARCHAR(100) NULL;
END
");
        }
    }
}
