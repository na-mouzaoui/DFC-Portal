using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419175500_CreateRequestedRecapTables")]
    public partial class CreateRequestedRecapTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* 1) TVA Collecte */
IF OBJECT_ID(N'[dbo].[TVACollecte_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVACollecte_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVACollecte_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TVACollecte]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVACollecte]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVACollecte] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [EncaissementTTC] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVACollecte_EncaissementTTC] DEFAULT(0),
        [Exonere] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVACollecte_Exonere] DEFAULT(0),
        [EncaissementHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVACollecte_EncaissementHT] DEFAULT(0),
        [TVA] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVACollecte_TVA] DEFAULT(0),
        CONSTRAINT [FK_TVACollecte_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TVACollecte_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TVACollecte_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TVACollecte_periode_ligne] ON [dbo].[TVACollecte]([id_periode], [id_designiation_encaissement]);
END

/* 2) TVA Deductible */
IF OBJECT_ID(N'[dbo].[TVADeductible_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVADeductible_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVADeductible_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TVADeductible]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVADeductible]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVADeductible] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [Immo] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVADeductible_Immo] DEFAULT(0),
        [BienService] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVADeductible_BienService] DEFAULT(0),
        [TVA] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVADeductible_TVA] DEFAULT(0),
        CONSTRAINT [FK_TVADeductible_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TVADeductible_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TVADeductible_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TVADeductible_periode_ligne] ON [dbo].[TVADeductible]([id_periode], [id_designiation_encaissement]);
END

/* 3) TVA a Payer */
IF OBJECT_ID(N'[dbo].[TVAPayer_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVAPayer_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVAPayer_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TVAPayer]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TVAPayer]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TVAPayer] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [TVACollecte] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVAPayer_TVACollecte] DEFAULT(0),
        [TVAImmo] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVAPayer_TVAImmo] DEFAULT(0),
        [TVABienService] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVAPayer_TVABienService] DEFAULT(0),
        [TVADeductible] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVAPayer_TVADeductible] DEFAULT(0),
        [TVA] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TVAPayer_TVA] DEFAULT(0),
        CONSTRAINT [FK_TVAPayer_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TVAPayer_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TVAPayer_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TVAPayer_periode_ligne] ON [dbo].[TVAPayer]([id_periode], [id_designiation_encaissement]);
END

/* 4) Timbre recap */
IF OBJECT_ID(N'[dbo].[TimbreRecap_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TimbreRecap_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TimbreRecap_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TimbreRecap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TimbreRecap]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TimbreRecap] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [CAHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TimbreRecap_CAHT] DEFAULT(0),
        [DroitTimbre] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TimbreRecap_DroitTimbre] DEFAULT(0),
        CONSTRAINT [FK_TimbreRecap_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TimbreRecap_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TimbreRecap_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TimbreRecap_periode_ligne] ON [dbo].[TimbreRecap]([id_periode], [id_designiation_encaissement]);
END

/* 5) TAP recap */
IF OBJECT_ID(N'[dbo].[TAPRecap_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TAPRecap_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TAPRecap_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TAPRecap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TAPRecap]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TAPRecap] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [MontantHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TAPRecap_MontantHT] DEFAULT(0),
        [MontantExonere] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TAPRecap_MontantExonere] DEFAULT(0),
        [TAP] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TAPRecap_TAP] DEFAULT(0),
        CONSTRAINT [FK_TAPRecap_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TAPRecap_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TAPRecap_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TAPRecap_periode_ligne] ON [dbo].[TAPRecap]([id_periode], [id_designiation_encaissement]);
END

/* 6) TNFDAL 1% */
IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TNFDAL1_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TNFDAL1_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TNFDAL]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TNFDAL] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [CAHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TNFDAL_CAHT] DEFAULT(0),
        [TNFDAL] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TNFDAL_TNFDAL] DEFAULT(0),
        CONSTRAINT [FK_TNFDAL_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TNFDAL1_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TNFDAL_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TNFDAL_periode_ligne] ON [dbo].[TNFDAL]([id_periode], [id_designiation_encaissement]);
END

/* 7) TACP 7% */
IF OBJECT_ID(N'[dbo].[TACP7_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TACP7_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TACP7_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TACP7]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TACP7] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [MontantHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TACP7_MontantHT] DEFAULT(0),
        [TACP] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TACP7_TACP] DEFAULT(0),
        CONSTRAINT [FK_TACP7_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[TACP7_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TACP7_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TACP7_periode_ligne] ON [dbo].[TACP7]([id_periode], [id_designiation_encaissement]);
END

/* 8) G50 */
IF OBJECT_ID(N'[dbo].[G50_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[G50_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_G50_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[G50]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[G50]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_G50] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [Montant] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_G50_Montant] DEFAULT(0),
        CONSTRAINT [FK_G50_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[G50_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_G50_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_G50_periode_ligne] ON [dbo].[G50]([id_periode], [id_designiation_encaissement]);
END

/* 9) Master recap 1.5% */
IF OBJECT_ID(N'[dbo].[MasterRecap_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MasterRecap_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_MasterRecap_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[MasterRecap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MasterRecap]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_MasterRecap] PRIMARY KEY,
        [id_designiation_encaissement] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [Montant] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_MasterRecap_Montant] DEFAULT(0),
        [Taxe15] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_MasterRecap_Taxe15] DEFAULT(0),
        CONSTRAINT [FK_MasterRecap_ligne] FOREIGN KEY([id_designiation_encaissement]) REFERENCES [dbo].[MasterRecap_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MasterRecap_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_MasterRecap_periode_ligne] ON [dbo].[MasterRecap]([id_periode], [id_designiation_encaissement]);
END

/* Seed lignes TVA Collecte */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TVACollecte_lignes])
BEGIN
    INSERT INTO [dbo].[TVACollecte_lignes] ([designiation]) VALUES
    (N'BNA EXPLOITATION (Siege)'),
    (N'CCP POST PAID (Siege)'),
    (N'CCP MOBIPOSTE (Siege)'),
    (N'CCP RACIMO (Siege)'),
    (N'SOFIA CCP'),
    (N'CCP DME'),
    (N'ALGERIE POSTE'),
    (N'VENTE TERMINAUX'),
    (N'CCP RECOUVREMENT A'),
    (N'CCP RECOUVREMENT B'),
    (N'ENCAISSEMENT TPE CCP'),
    (N'ENCAISSEMENT TPE BNA'),
    (N'Total (1)'),
    (N'DR Alger'),
    (N'DR Setif'),
    (N'DR Constantine'),
    (N'DR Annaba'),
    (N'DR Chlef'),
    (N'DR Oran'),
    (N'DR Bechar'),
    (N'DR Ouargla'),
    (N'Total (2)'),
    (N'Total (1)+(2)');
END

/* Seed lignes TVA Deductible */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TVADeductible_lignes])
BEGIN
    INSERT INTO [dbo].[TVADeductible_lignes] ([designiation]) VALUES
    (N'Direction Generale'),
    (N'Direction AutoLiquidation'),
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

/* Seed lignes TVA a Payer */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TVAPayer_lignes])
BEGIN
    INSERT INTO [dbo].[TVAPayer_lignes] ([designiation]) VALUES
    (N'Precompte'),
    (N'Reversement'),
    (N'Direction Generale'),
    (N'TVA AutoLiquidation'),
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

/* Seed lignes Timbre */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TimbreRecap_lignes])
BEGIN
    INSERT INTO [dbo].[TimbreRecap_lignes] ([designiation]) VALUES
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

/* Seed lignes TAP */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TAPRecap_lignes])
BEGIN
    INSERT INTO [dbo].[TAPRecap_lignes] ([designiation]) VALUES
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

/* Seed lignes TNFDAL1 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TNFDAL1_lignes])
BEGIN
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
    (N'Regul CA du Janvier 2025 a Juin 2025'),
    (N'Total');
END

/* Seed lignes TACP7 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TACP7_lignes])
BEGIN
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

/* Seed lignes G50 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[G50_lignes])
BEGIN
    INSERT INTO [dbo].[G50_lignes] ([designiation]) VALUES
    (N'ACOMPTE PROVISIONEL'),
    (N'TVA COLLECTEE'),
    (N'TVA DEDUCTIBLE'),
    (N'Total TVA a Payer (Voir la Piece)'),
    (N'DROIT DE TIMBRE'),
    (N'TACP 7%'),
    (N'TNFPDAL 1%'),
    (N'IRG SALAIRE'),
    (N'AUTRE IRG'),
    (N'TAXE DE FORMATION'),
    (N'TAXE VEHICULE'),
    (N'LA TAP'),
    (N'TAXE 2%'),
    (N'Total Declaration G 50 (Voir la Piece)'),
    (N'TAXE 1,5% SUR MASTERS (Voir la Piece)'),
    (N'Total');
END

/* Seed lignes Master 1.5% */
IF NOT EXISTS (SELECT 1 FROM [dbo].[MasterRecap_lignes])
BEGIN
    INSERT INTO [dbo].[MasterRecap_lignes] ([designiation]) VALUES
    (N'Masters'),
    (N'ASSILOU COM'),
    (N'GTS PHONE'),
    (N'ALGERIE POSTE'),
    (N'Total');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[MasterRecap]', N'U') IS NOT NULL DROP TABLE [dbo].[MasterRecap];
IF OBJECT_ID(N'[dbo].[MasterRecap_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[MasterRecap_lignes];

IF OBJECT_ID(N'[dbo].[G50]', N'U') IS NOT NULL DROP TABLE [dbo].[G50];
IF OBJECT_ID(N'[dbo].[G50_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[G50_lignes];

IF OBJECT_ID(N'[dbo].[TACP7]', N'U') IS NOT NULL DROP TABLE [dbo].[TACP7];
IF OBJECT_ID(N'[dbo].[TACP7_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TACP7_lignes];

IF OBJECT_ID(N'[dbo].[TNFDAL]', N'U') IS NOT NULL DROP TABLE [dbo].[TNFDAL];
IF OBJECT_ID(N'[dbo].[TNFDAL1_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TNFDAL1_lignes];

IF OBJECT_ID(N'[dbo].[TAPRecap]', N'U') IS NOT NULL DROP TABLE [dbo].[TAPRecap];
IF OBJECT_ID(N'[dbo].[TAPRecap_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TAPRecap_lignes];

IF OBJECT_ID(N'[dbo].[TimbreRecap]', N'U') IS NOT NULL DROP TABLE [dbo].[TimbreRecap];
IF OBJECT_ID(N'[dbo].[TimbreRecap_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TimbreRecap_lignes];

IF OBJECT_ID(N'[dbo].[TVAPayer]', N'U') IS NOT NULL DROP TABLE [dbo].[TVAPayer];
IF OBJECT_ID(N'[dbo].[TVAPayer_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TVAPayer_lignes];

IF OBJECT_ID(N'[dbo].[TVADeductible]', N'U') IS NOT NULL DROP TABLE [dbo].[TVADeductible];
IF OBJECT_ID(N'[dbo].[TVADeductible_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TVADeductible_lignes];

IF OBJECT_ID(N'[dbo].[TVACollecte]', N'U') IS NOT NULL DROP TABLE [dbo].[TVACollecte];
IF OBJECT_ID(N'[dbo].[TVACollecte_lignes]', N'U') IS NOT NULL DROP TABLE [dbo].[TVACollecte_lignes];
");
        }
    }
}
