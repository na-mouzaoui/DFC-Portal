using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419164000_CreatePerRecapInfoAndLineTables")]
    public partial class CreatePerRecapInfoAndLineTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* TVA Collectee */
IF OBJECT_ID(N'[dbo].[RecapTvaCollecteeLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaCollecteeLigne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaCollecteeLigne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTvaCollecteeLigne_Ordre] ON [dbo].[RecapTvaCollecteeLigne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTvaCollecteeLigne_Designation] ON [dbo].[RecapTvaCollecteeLigne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTvaCollectee]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaCollectee]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaCollectee] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTvaCollectee_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTvaCollectee_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTvaCollecteeLigne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTvaCollectee_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTvaCollectee_Period_Direction_Ligne] ON [dbo].[RecapTvaCollectee]([Mois], [Annee], [Direction], [LigneId]);
END

/* TVA a Payer */
IF OBJECT_ID(N'[dbo].[RecapTvaAPayerLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaAPayerLigne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaAPayerLigne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTvaAPayerLigne_Ordre] ON [dbo].[RecapTvaAPayerLigne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTvaAPayerLigne_Designation] ON [dbo].[RecapTvaAPayerLigne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTvaAPayer]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaAPayer]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaAPayer] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTvaAPayer_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTvaAPayer_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTvaAPayerLigne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTvaAPayer_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTvaAPayer_Period_Direction_Ligne] ON [dbo].[RecapTvaAPayer]([Mois], [Annee], [Direction], [LigneId]);
END

/* TVA Situation */
IF OBJECT_ID(N'[dbo].[RecapTvaSituationLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaSituationLigne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaSituationLigne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTvaSituationLigne_Ordre] ON [dbo].[RecapTvaSituationLigne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTvaSituationLigne_Designation] ON [dbo].[RecapTvaSituationLigne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTvaSituation]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTvaSituation]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTvaSituation] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTvaSituation_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTvaSituation_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTvaSituationLigne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTvaSituation_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTvaSituation_Period_Direction_Ligne] ON [dbo].[RecapTvaSituation]([Mois], [Annee], [Direction], [LigneId]);
END

/* Droits Timbre */
IF OBJECT_ID(N'[dbo].[RecapDroitsTimbreLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapDroitsTimbreLigne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapDroitsTimbreLigne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapDroitsTimbreLigne_Ordre] ON [dbo].[RecapDroitsTimbreLigne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapDroitsTimbreLigne_Designation] ON [dbo].[RecapDroitsTimbreLigne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapDroitsTimbre]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapDroitsTimbre]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapDroitsTimbre] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapDroitsTimbre_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapDroitsTimbre_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapDroitsTimbreLigne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapDroitsTimbre_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapDroitsTimbre_Period_Direction_Ligne] ON [dbo].[RecapDroitsTimbre]([Mois], [Annee], [Direction], [LigneId]);
END

/* TACP7 */
IF OBJECT_ID(N'[dbo].[RecapTacp7Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTacp7Ligne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTacp7Ligne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTacp7Ligne_Ordre] ON [dbo].[RecapTacp7Ligne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTacp7Ligne_Designation] ON [dbo].[RecapTacp7Ligne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTacp7]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTacp7]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTacp7] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTacp7_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTacp7_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTacp7Ligne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTacp7_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTacp7_Period_Direction_Ligne] ON [dbo].[RecapTacp7]([Mois], [Annee], [Direction], [LigneId]);
END

/* TNFDAL1 */
IF OBJECT_ID(N'[dbo].[RecapTnfdal1Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTnfdal1Ligne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTnfdal1Ligne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTnfdal1Ligne_Ordre] ON [dbo].[RecapTnfdal1Ligne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTnfdal1Ligne_Designation] ON [dbo].[RecapTnfdal1Ligne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTnfdal1]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTnfdal1]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTnfdal1] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTnfdal1_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTnfdal1_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTnfdal1Ligne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTnfdal1_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTnfdal1_Period_Direction_Ligne] ON [dbo].[RecapTnfdal1]([Mois], [Annee], [Direction], [LigneId]);
END

/* TAP15 */
IF OBJECT_ID(N'[dbo].[RecapTap15Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTap15Ligne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTap15Ligne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapTap15Ligne_Ordre] ON [dbo].[RecapTap15Ligne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapTap15Ligne_Designation] ON [dbo].[RecapTap15Ligne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapTap15]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapTap15]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapTap15] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapTap15_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapTap15_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapTap15Ligne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapTap15_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapTap15_Period_Direction_Ligne] ON [dbo].[RecapTap15]([Mois], [Annee], [Direction], [LigneId]);
END

/* Masters15 */
IF OBJECT_ID(N'[dbo].[RecapMasters15Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapMasters15Ligne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapMasters15Ligne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapMasters15Ligne_Ordre] ON [dbo].[RecapMasters15Ligne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapMasters15Ligne_Designation] ON [dbo].[RecapMasters15Ligne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapMasters15]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapMasters15]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapMasters15] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapMasters15_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapMasters15_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapMasters15Ligne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapMasters15_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapMasters15_Period_Direction_Ligne] ON [dbo].[RecapMasters15]([Mois], [Annee], [Direction], [LigneId]);
END

/* G50 */
IF OBJECT_ID(N'[dbo].[RecapG50Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapG50Ligne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapG50Ligne] PRIMARY KEY,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_RecapG50Ligne_Ordre] ON [dbo].[RecapG50Ligne]([Ordre]);
    CREATE UNIQUE INDEX [UX_RecapG50Ligne_Designation] ON [dbo].[RecapG50Ligne]([Designation]);
END

IF OBJECT_ID(N'[dbo].[RecapG50]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecapG50]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RecapG50] PRIMARY KEY,
        [UserId] INT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [LigneId] INT NOT NULL,
        [ValeursJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_RecapG50_ValeursJson] DEFAULT(N'{}'),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_RecapG50_Ligne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[RecapG50Ligne]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RecapG50_User] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE UNIQUE INDEX [UX_RecapG50_Period_Direction_Ligne] ON [dbo].[RecapG50]([Mois], [Annee], [Direction], [LigneId]);
END

/* Seed lignes TVA Collectee */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTvaCollecteeLigne])
BEGIN
    INSERT INTO [dbo].[RecapTvaCollecteeLigne] ([Ordre], [Designation]) VALUES
    (1, N'BNA EXPLOITATION (Siege)'),
    (2, N'CCP POST PAID (Siege)'),
    (3, N'CCP MOBIPOSTE (Siege)'),
    (4, N'CCP RACIMO (Siege)'),
    (5, N'SOFIA CCP'),
    (6, N'CCP DME'),
    (7, N'ALGERIE POSTE'),
    (8, N'VENTE TERMINAUX'),
    (9, N'CCP RECOUVREMENT A'),
    (10, N'CCP RECOUVREMENT B'),
    (11, N'ENCAISSEMENT TPE CCP'),
    (12, N'ENCAISSEMENT TPE BNA'),
    (13, N'Total (1)'),
    (14, N'DR Alger'),
    (15, N'DR Setif'),
    (16, N'DR Constantine'),
    (17, N'DR Annaba'),
    (18, N'DR Chlef'),
    (19, N'DR Oran'),
    (20, N'DR Bechar'),
    (21, N'DR Ouargla'),
    (22, N'Total (2)'),
    (23, N'Total (1)+(2)');
END

/* Seed lignes TVA a Payer */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTvaAPayerLigne])
BEGIN
    INSERT INTO [dbo].[RecapTvaAPayerLigne] ([Ordre], [Designation]) VALUES
    (1, N'Precompte'),
    (2, N'Reversement'),
    (3, N'Direction Generale'),
    (4, N'TVA AutoLiquidation'),
    (5, N'DR Alger'),
    (6, N'DR Setif'),
    (7, N'DR Constantine'),
    (8, N'DR Annaba'),
    (9, N'DR Chlef'),
    (10, N'DR Oran'),
    (11, N'DR Bechar'),
    (12, N'DR Ouargla'),
    (13, N'Total');
END

/* Seed lignes TVA Situation */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTvaSituationLigne])
BEGIN
    INSERT INTO [dbo].[RecapTvaSituationLigne] ([Ordre], [Designation]) VALUES
    (1, N'Direction Generale'),
    (2, N'Direction AutoLiquidation'),
    (3, N'DR Alger'),
    (4, N'DR Setif'),
    (5, N'DR Constantine'),
    (6, N'DR Annaba'),
    (7, N'DR Chlef'),
    (8, N'DR Oran'),
    (9, N'DR Bechar'),
    (10, N'DR Ouargla'),
    (11, N'Total');
END

/* Seed lignes Droits Timbre */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapDroitsTimbreLigne])
BEGIN
    INSERT INTO [dbo].[RecapDroitsTimbreLigne] ([Ordre], [Designation]) VALUES
    (1, N'DR Alger'),
    (2, N'DR Setif'),
    (3, N'DR Constantine'),
    (4, N'DR Annaba'),
    (5, N'DR Chlef'),
    (6, N'DR Oran'),
    (7, N'DR Bechar'),
    (8, N'DR Ouargla'),
    (9, N'Total');
END

/* Seed lignes TACP7 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTacp7Ligne])
BEGIN
    INSERT INTO [dbo].[RecapTacp7Ligne] ([Ordre], [Designation]) VALUES
    (1, N'Masters'),
    (2, N'Mobiposte'),
    (3, N'Racimo'),
    (4, N'Algerie Poste'),
    (5, N'DR Alger'),
    (6, N'DR Setif'),
    (7, N'DR Constantine'),
    (8, N'DR Annaba'),
    (9, N'DR Chlef'),
    (10, N'DR Oran'),
    (11, N'DR Bechar'),
    (12, N'DR Ouargla'),
    (13, N'Total');
END

/* Seed lignes TNFDAL1 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTnfdal1Ligne])
BEGIN
    INSERT INTO [dbo].[RecapTnfdal1Ligne] ([Ordre], [Designation]) VALUES
    (1, N'Direction Generale'),
    (2, N'DR Alger'),
    (3, N'DR Setif'),
    (4, N'DR Constantine'),
    (5, N'DR Annaba'),
    (6, N'DR Chlef'),
    (7, N'DR Oran'),
    (8, N'DR Bechar'),
    (9, N'DR Ouargla'),
    (10, N'Regul CA du Janvier 2025 a Juin 2025'),
    (11, N'Total');
END

/* Seed lignes TAP15 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapTap15Ligne])
BEGIN
    INSERT INTO [dbo].[RecapTap15Ligne] ([Ordre], [Designation]) VALUES
    (1, N'Direction Generale'),
    (2, N'DR Alger'),
    (3, N'DR Setif'),
    (4, N'DR Constantine'),
    (5, N'DR Annaba'),
    (6, N'DR Chlef'),
    (7, N'DR Oran'),
    (8, N'DR Bechar'),
    (9, N'DR Ouargla'),
    (10, N'Total');
END

/* Seed lignes Masters15 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapMasters15Ligne])
BEGIN
    INSERT INTO [dbo].[RecapMasters15Ligne] ([Ordre], [Designation]) VALUES
    (1, N'Masters'),
    (2, N'ASSILOU COM'),
    (3, N'GTS PHONE'),
    (4, N'ALGERIE POSTE'),
    (5, N'Total');
END

/* Seed lignes G50 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[RecapG50Ligne])
BEGIN
    INSERT INTO [dbo].[RecapG50Ligne] ([Ordre], [Designation]) VALUES
    (1, N'ACOMPTE PROVISIONEL'),
    (2, N'TVA COLLECTEE'),
    (3, N'TVA DEDUCTIBLE'),
    (4, N'Total TVA a Payer (Voir la Piece)'),
    (5, N'DROIT DE TIMBRE'),
    (6, N'TACP 7%'),
    (7, N'TNFPDAL 1%'),
    (8, N'IRG SALAIRE'),
    (9, N'AUTRE IRG'),
    (10, N'TAXE DE FORMATION'),
    (11, N'TAXE VEHICULE'),
    (12, N'LA TAP'),
    (13, N'TAXE 2%'),
    (14, N'Total Declaration G 50 (Voir la Piece)'),
    (15, N'TAXE 1,5% SUR MASTERS (Voir la Piece)'),
    (16, N'Total');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[RecapG50]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapG50];
IF OBJECT_ID(N'[dbo].[RecapG50Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapG50Ligne];

IF OBJECT_ID(N'[dbo].[RecapMasters15]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapMasters15];
IF OBJECT_ID(N'[dbo].[RecapMasters15Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapMasters15Ligne];

IF OBJECT_ID(N'[dbo].[RecapTap15]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTap15];
IF OBJECT_ID(N'[dbo].[RecapTap15Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTap15Ligne];

IF OBJECT_ID(N'[dbo].[RecapTnfdal1]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTnfdal1];
IF OBJECT_ID(N'[dbo].[RecapTnfdal1Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTnfdal1Ligne];

IF OBJECT_ID(N'[dbo].[RecapTacp7]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTacp7];
IF OBJECT_ID(N'[dbo].[RecapTacp7Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTacp7Ligne];

IF OBJECT_ID(N'[dbo].[RecapDroitsTimbre]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapDroitsTimbre];
IF OBJECT_ID(N'[dbo].[RecapDroitsTimbreLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapDroitsTimbreLigne];

IF OBJECT_ID(N'[dbo].[RecapTvaSituation]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaSituation];
IF OBJECT_ID(N'[dbo].[RecapTvaSituationLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaSituationLigne];

IF OBJECT_ID(N'[dbo].[RecapTvaAPayer]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaAPayer];
IF OBJECT_ID(N'[dbo].[RecapTvaAPayerLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaAPayerLigne];

IF OBJECT_ID(N'[dbo].[RecapTvaCollectee]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaCollectee];
IF OBJECT_ID(N'[dbo].[RecapTvaCollecteeLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[RecapTvaCollecteeLigne];
");
        }
    }
}
