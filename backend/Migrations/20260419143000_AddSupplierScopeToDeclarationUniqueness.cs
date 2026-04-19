using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419143000_AddSupplierScopeToDeclarationUniqueness")]
    public partial class AddSupplierScopeToDeclarationUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.Declaration', N'SupplierScopeKey') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Declaration]
            ADD [SupplierScopeKey] NVARCHAR(64) NOT NULL CONSTRAINT [DF_Declaration_SupplierScopeKey] DEFAULT(N'');
    END

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Declaration_Periode_Direction_Tableau'
          AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        DROP INDEX [UX_Declaration_Periode_Direction_Tableau] ON [dbo].[Declaration];
    END

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Declaration_Periode_Direction_Tableau_SupplierScope'
          AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        DROP INDEX [UX_Declaration_Periode_Direction_Tableau_SupplierScope] ON [dbo].[Declaration];
    END

    CREATE UNIQUE INDEX [UX_Declaration_Periode_Direction_Tableau_SupplierScope]
    ON [dbo].[Declaration]([PeriodeId], [Direction], [TableauCode], [SupplierScopeKey]);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Declaration_Periode_Direction_Tableau_SupplierScope'
          AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        DROP INDEX [UX_Declaration_Periode_Direction_Tableau_SupplierScope] ON [dbo].[Declaration];
    END

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Declaration_Periode_Direction_Tableau'
          AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
    )
    BEGIN
        DROP INDEX [UX_Declaration_Periode_Direction_Tableau] ON [dbo].[Declaration];
    END

    CREATE UNIQUE INDEX [UX_Declaration_Periode_Direction_Tableau]
    ON [dbo].[Declaration]([PeriodeId], [Direction], [TableauCode]);

    IF COL_LENGTH(N'dbo.Declaration', N'SupplierScopeKey') IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 FROM sys.default_constraints
            WHERE name = N'DF_Declaration_SupplierScopeKey'
              AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
        )
        BEGIN
            ALTER TABLE [dbo].[Declaration] DROP CONSTRAINT [DF_Declaration_SupplierScopeKey];
        END

        ALTER TABLE [dbo].[Declaration] DROP COLUMN [SupplierScopeKey];
    END
END
");
        }
    }
}
