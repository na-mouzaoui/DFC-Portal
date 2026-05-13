using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260513093000_AddTnfdalTacpDeclarationTables")]
    public partial class AddTnfdalTacpDeclarationTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* TNFDAL declaration lignes */
IF OBJECT_ID(N'[dbo].[TNFDAL1Dec_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TNFDAL1Dec_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TNFDAL1Dec_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_TNFDAL1Dec_lignes_designiation] ON [dbo].[TNFDAL1Dec_lignes]([designiation]);
END

/* TNFDAL declaration data */
IF OBJECT_ID(N'[dbo].[TNFDAL1_declaration]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TNFDAL1_declaration]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TNFDAL1_declaration] PRIMARY KEY,
        [id_designiation_TNFDAL] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [CAHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TNFDAL1_declaration_CAHT] DEFAULT(0),
        [TNFDAL] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TNFDAL1_declaration_TNFDAL] DEFAULT(0),
        CONSTRAINT [FK_TNFDAL1_declaration_ligne] FOREIGN KEY([id_designiation_TNFDAL]) REFERENCES [dbo].[TNFDAL1Dec_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TNFDAL1_declaration_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TNFDAL1_declaration_periode_ligne] ON [dbo].[TNFDAL1_declaration]([id_periode], [id_designiation_TNFDAL]);
END

/* TACP declaration lignes */
IF OBJECT_ID(N'[dbo].[TACP7Dec_lignes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TACP7Dec_lignes]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TACP7Dec_lignes] PRIMARY KEY,
        [designiation] NVARCHAR(250) NOT NULL
    );
    CREATE UNIQUE INDEX [UX_TACP7Dec_lignes_designiation] ON [dbo].[TACP7Dec_lignes]([designiation]);
END

/* TACP declaration data */
IF OBJECT_ID(N'[dbo].[TACP7_declaration]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TACP7_declaration]
    (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TACP7_declaration] PRIMARY KEY,
        [id_designiation_TACP] INT NOT NULL,
        [id_periode] INT NOT NULL,
        [MontantHT] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TACP7_declaration_MontantHT] DEFAULT(0),
        [TACP] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TACP7_declaration_TACP] DEFAULT(0),
        CONSTRAINT [FK_TACP7_declaration_ligne] FOREIGN KEY([id_designiation_TACP]) REFERENCES [dbo].[TACP7Dec_lignes]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TACP7_declaration_periode] FOREIGN KEY([id_periode]) REFERENCES [dbo].[Periode]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [UX_TACP7_declaration_periode_ligne] ON [dbo].[TACP7_declaration]([id_periode], [id_designiation_TACP]);
END

/* Seed lignes TNFDAL declaration */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TNFDAL1Dec_lignes])
BEGIN
    INSERT INTO [dbo].[TNFDAL1Dec_lignes] ([designiation]) VALUES
        (N'Direction Generale');
END

/* Seed lignes TACP declaration */
IF NOT EXISTS (SELECT 1 FROM [dbo].[TACP7Dec_lignes])
BEGIN
    INSERT INTO [dbo].[TACP7Dec_lignes] ([designiation]) VALUES
        (N'Masters'),
        (N'Mobiposte'),
        (N'Racimo'),
        (N'Algerie Poste');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TNFDAL1_declaration]', N'U') IS NOT NULL
    DROP TABLE [dbo].[TNFDAL1_declaration];
IF OBJECT_ID(N'[dbo].[TNFDAL1Dec_lignes]', N'U') IS NOT NULL
    DROP TABLE [dbo].[TNFDAL1Dec_lignes];

IF OBJECT_ID(N'[dbo].[TACP7_declaration]', N'U') IS NOT NULL
    DROP TABLE [dbo].[TACP7_declaration];
IF OBJECT_ID(N'[dbo].[TACP7Dec_lignes]', N'U') IS NOT NULL
    DROP TABLE [dbo].[TACP7Dec_lignes];
");
        }
    }
}
