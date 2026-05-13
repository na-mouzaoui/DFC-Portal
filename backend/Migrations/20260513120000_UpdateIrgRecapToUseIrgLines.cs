using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260513120000_UpdateIrgRecapToUseIrgLines")]
    public partial class UpdateIrgRecapToUseIrgLines : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* IRG recap schema aligned to Irg */
IF OBJECT_ID(N'[dbo].[IRGRecap]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.IRGRecap', N'id_designiation_encaissement') IS NOT NULL
    BEGIN
        IF OBJECT_ID(N'[dbo].[IRGRecap_new]', N'U') IS NOT NULL
            DROP TABLE [dbo].[IRGRecap_new];

        CREATE TABLE [dbo].[IRGRecap_new]
        (
            [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            [LigneId] INT NOT NULL,
            [PeriodeId] INT NOT NULL,
            [AssietteImposable] DECIMAL(18,2) NULL,
            [Montant] DECIMAL(18,2) NULL,
            CONSTRAINT [FK_IRGRecap_IrgLigne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[IrgLigne]([Id]),
            CONSTRAINT [FK_IRGRecap_Periode] FOREIGN KEY([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
        );

        IF OBJECT_ID(N'[dbo].[IRGRecap_lignes]', N'U') IS NOT NULL
        BEGIN
            INSERT INTO [dbo].[IRGRecap_new] ([LigneId], [PeriodeId], [AssietteImposable], [Montant])
            SELECT l2.[Id], r.[id_periode], r.[AssietteImposable], r.[Montant]
            FROM [dbo].[IRGRecap] r
            INNER JOIN [dbo].[IRGRecap_lignes] l ON l.[id] = r.[id_designiation_encaissement]
            INNER JOIN [dbo].[IrgLigne] l2 ON l2.[Designation] = l.[designiation];
        END

        DROP TABLE [dbo].[IRGRecap];
        EXEC sp_rename N'[dbo].[IRGRecap_new]', N'IRGRecap';
    END
END

IF OBJECT_ID(N'[dbo].[IRGRecap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IRGRecap]
    (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [AssietteImposable] DECIMAL(18,2) NULL,
        [Montant] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_IRGRecap_IrgLigne] FOREIGN KEY([LigneId]) REFERENCES [dbo].[IrgLigne]([Id]),
        CONSTRAINT [FK_IRGRecap_Periode] FOREIGN KEY([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_IRGRecap_LigneId' AND object_id = OBJECT_ID(N'[dbo].[IRGRecap]')
)
BEGIN
    CREATE INDEX [IX_IRGRecap_LigneId] ON [dbo].[IRGRecap]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_IRGRecap_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[IRGRecap]')
)
BEGIN
    CREATE INDEX [IX_IRGRecap_PeriodeId] ON [dbo].[IRGRecap]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[IRGRecap_lignes]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[IRGRecap_lignes];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[IRGRecap]', N'U') IS NOT NULL
    DROP TABLE [dbo].[IRGRecap];

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
");
        }
    }
}
