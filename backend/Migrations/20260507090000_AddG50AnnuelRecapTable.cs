using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260507090000_AddG50AnnuelRecapTable")]
    public partial class AddG50AnnuelRecapTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[G50Annuel]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[G50Annuel]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_G50Annuel] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [Montant] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_G50Annuel_Montant] DEFAULT(0),
        CONSTRAINT [FK_G50Annuel_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[G50_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_G50Annuel_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_G50Annuel_periode_ligne] ON [dbo].[G50Annuel]([id_periode], [id_designiation_encaissement]);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[G50Annuel]', N'U') IS NOT NULL DROP TABLE [dbo].[G50Annuel];
");
        }
    }
}
