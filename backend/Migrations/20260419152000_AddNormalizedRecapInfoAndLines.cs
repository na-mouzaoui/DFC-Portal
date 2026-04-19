using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419152000_AddNormalizedRecapInfoAndLines")]
    public partial class AddNormalizedRecapInfoAndLines : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[EtatsDeSortieInfo]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EtatsDeSortieInfo]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_EtatsDeSortieInfo] PRIMARY KEY,
        [UserId] INT NOT NULL,
        [Key] NVARCHAR(50) NOT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL CONSTRAINT [DF_EtatsDeSortieInfo_Direction] DEFAULT(N''),
        [FormulasJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_EtatsDeSortieInfo_FormulasJson] DEFAULT(N'{}'),
        [IsGenerated] BIT NOT NULL CONSTRAINT [DF_EtatsDeSortieInfo_IsGenerated] DEFAULT(1),
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_EtatsDeSortieInfo_Users_UserId] FOREIGN KEY([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_EtatsDeSortieInfo_UserId] ON [dbo].[EtatsDeSortieInfo]([UserId]);
    CREATE UNIQUE INDEX [UX_EtatsDeSortieInfo_Key_Mois_Annee_Direction] ON [dbo].[EtatsDeSortieInfo]([Key], [Mois], [Annee], [Direction]);
END

IF OBJECT_ID(N'[dbo].[EtatsDeSortieLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EtatsDeSortieLigne]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_EtatsDeSortieLigne] PRIMARY KEY,
        [RecapInfoId] INT NOT NULL,
        [Ordre] INT NOT NULL,
        [Designation] NVARCHAR(250) NOT NULL CONSTRAINT [DF_EtatsDeSortieLigne_Designation] DEFAULT(N''),
        [RowJson] NVARCHAR(MAX) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FK_EtatsDeSortieLigne_EtatsDeSortieInfo] FOREIGN KEY([RecapInfoId]) REFERENCES [dbo].[EtatsDeSortieInfo]([Id]) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX [UX_EtatsDeSortieLigne_Recap_Ordre] ON [dbo].[EtatsDeSortieLigne]([RecapInfoId], [Ordre]);
END

IF OBJECT_ID(N'[dbo].[EtatsDeSortie]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[EtatsDeSortieInfo] ([UserId], [Key], [Title], [Mois], [Annee], [Direction], [FormulasJson], [IsGenerated], [CreatedAt], [UpdatedAt])
    SELECT legacy.[UserId], legacy.[Key], legacy.[Title], legacy.[Mois], legacy.[Annee], N'', legacy.[FormulasJson], legacy.[IsGenerated], legacy.[CreatedAt], legacy.[UpdatedAt]
    FROM [dbo].[EtatsDeSortie] legacy
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM [dbo].[EtatsDeSortieInfo] info
        WHERE info.[Key] = legacy.[Key]
          AND info.[Mois] = legacy.[Mois]
          AND info.[Annee] = legacy.[Annee]
          AND info.[Direction] = N''
    );

    INSERT INTO [dbo].[EtatsDeSortieLigne] ([RecapInfoId], [Ordre], [Designation], [RowJson], [CreatedAt], [UpdatedAt])
    SELECT info.[Id],
           TRY_CONVERT(INT, rowData.[key]) AS [Ordre],
           ISNULL(JSON_VALUE(rowData.[value], '$.designation'), N''),
           rowData.[value],
           info.[CreatedAt],
           info.[UpdatedAt]
    FROM [dbo].[EtatsDeSortieInfo] info
    INNER JOIN [dbo].[EtatsDeSortie] legacy
        ON legacy.[Key] = info.[Key]
       AND legacy.[Mois] = info.[Mois]
       AND legacy.[Annee] = info.[Annee]
    CROSS APPLY OPENJSON(legacy.[RowsJson]) rowData
    WHERE info.[Direction] = N''
      AND NOT EXISTS
      (
          SELECT 1
          FROM [dbo].[EtatsDeSortieLigne] lines
          WHERE lines.[RecapInfoId] = info.[Id]
      );
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[EtatsDeSortieLigne]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[EtatsDeSortieLigne];
END

IF OBJECT_ID(N'[dbo].[EtatsDeSortieInfo]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[EtatsDeSortieInfo];
END
");
        }
    }
}
