using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419193000_CreateRecapRegistryAndCleanupUselessTables")]
    public partial class CreateRecapRegistryAndCleanupUselessTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* Create Recap registry table */
IF OBJECT_ID(N'[dbo].[Recap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Recap]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Recap] PRIMARY KEY,
        [UserId] INT NOT NULL,
        [Key] NVARCHAR(50) NOT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL CONSTRAINT [DF_Recap_Direction] DEFAULT(N''),
        [FormulasJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Recap_FormulasJson] DEFAULT(N'{}'),
        [IsGenerated] BIT NOT NULL CONSTRAINT [DF_Recap_IsGenerated] DEFAULT(1),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_Recap_Users_UserId] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_Recap_UserId] ON [dbo].[Recap]([UserId]);
    CREATE UNIQUE INDEX [UX_Recap_Key_Mois_Annee_Direction] ON [dbo].[Recap]([Key], [Mois], [Annee], [Direction]);
END

/* Migrate data from previous registry table */
IF OBJECT_ID(N'[dbo].[EtatsDeSortieInfo]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[Recap] ([UserId], [Key], [Title], [Mois], [Annee], [Direction], [FormulasJson], [IsGenerated], [CreatedAt], [UpdatedAt])
    SELECT e.[UserId], e.[Key], e.[Title], e.[Mois], e.[Annee], e.[Direction], e.[FormulasJson], e.[IsGenerated], e.[CreatedAt], e.[UpdatedAt]
    FROM [dbo].[EtatsDeSortieInfo] e
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM [dbo].[Recap] r
        WHERE r.[Key] = e.[Key]
          AND r.[Mois] = e.[Mois]
          AND r.[Annee] = e.[Annee]
          AND r.[Direction] = e.[Direction]
    );
END

/* Drop 100% unused legacy recap tables */
IF OBJECT_ID(N'[dbo].[EtatsDeSortieLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[EtatsDeSortieLigne];
IF OBJECT_ID(N'[dbo].[EtatsDeSortieInfo]', N'U') IS NOT NULL DROP TABLE [dbo].[EtatsDeSortieInfo];
IF OBJECT_ID(N'[dbo].[EtatsDeSortie]', N'U') IS NOT NULL DROP TABLE [dbo].[EtatsDeSortie];

/* Drop intermediate generic recap tables (unused) */
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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Recap]', N'U') IS NOT NULL DROP TABLE [dbo].[Recap];
");
        }
    }
}
