using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260512090000_UpdateIrgTnfdalTacpLines")]
    public partial class UpdateIrgTnfdalTacpLines : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* IRG ligne updates */
IF OBJECT_ID(N'[dbo].[IrgLigne]', N'U') IS NOT NULL
BEGIN
    UPDATE [dbo].[IrgLigne]
    SET [Designation] = N'IRG Challenge 10%'
    WHERE [Designation] = N'IRG Challenge';

    IF NOT EXISTS (SELECT 1 FROM [dbo].[IrgLigne] WHERE [Designation] = N'IRG Challenge 10%')
    BEGIN
        INSERT INTO [dbo].[IrgLigne] ([Designation]) VALUES (N'IRG Challenge 10%');
    END
END

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
        (N'Total');
END

/* IRG recap tables */
IF OBJECT_ID(N'[dbo].[IRGRecap_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IRGRecap_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_IRGRecap_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[IRGRecap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IRGRecap]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_IRGRecap] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [AssietteImposable] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_IRGRecap_AssietteImposable] DEFAULT(0),
        [Montant] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_IRGRecap_Montant] DEFAULT(0),
        CONSTRAINT [FK_IRGRecap_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[IRGRecap_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_IRGRecap_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_IRGRecap_periode_ligne] ON [dbo].[IRGRecap]([id_periode], [id_designiation_encaissement]);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[IRGRecap_lignes])
BEGIN
    INSERT INTO [dbo].[IRGRecap_lignes] ([designiation]) VALUES
        (N'IRG sur Salaire Bareme'),
        (N'Autre IRG 10%'),
        (N'Autre IRG 15 % (consultants, athletes, ...)'),
        (N'Jetons de presence 10%'),
        (N'Tantieme 10%'),
        (N'IRG Challenge 10%'),
        (N'Total');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[IRGRecap]', N'U') IS NOT NULL
    DROP TABLE [dbo].[IRGRecap];
IF OBJECT_ID(N'[dbo].[IRGRecap_lignes]', N'U') IS NOT NULL
    DROP TABLE [dbo].[IRGRecap_lignes];
");
        }
    }
}
