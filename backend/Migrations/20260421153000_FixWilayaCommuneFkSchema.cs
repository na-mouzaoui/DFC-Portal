using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260421153000_FixWilayaCommuneFkSchema")]
    public partial class FixWilayaCommuneFkSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Wilaya]', N'U') IS NULL OR OBJECT_ID(N'[dbo].[Commune]', N'U') IS NULL
    RETURN;

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Tap_Commune')
    ALTER TABLE [dbo].[Tap] DROP CONSTRAINT [FK_Tap_Commune];

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Commune_Wilaya')
    ALTER TABLE [dbo].[Commune] DROP CONSTRAINT [FK_Commune_Wilaya];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Wilaya', 'Id') IS NULL
    ALTER TABLE [dbo].[Wilaya] ADD [Id] INT IDENTITY(1,1) NOT NULL;

IF COL_LENGTH('dbo.Commune', 'Id') IS NULL
    ALTER TABLE [dbo].[Commune] ADD [Id] INT IDENTITY(1,1) NOT NULL;

IF COL_LENGTH('dbo.Commune', 'WilayaId') IS NULL
    ALTER TABLE [dbo].[Commune] ADD [WilayaId] INT NULL;

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Tap', 'CommuneId') IS NULL
    ALTER TABLE [dbo].[Tap] ADD [CommuneId] INT NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Wilaya', 'Code') IS NOT NULL AND COL_LENGTH('dbo.Commune', 'WilayaCode') IS NOT NULL
BEGIN
    EXEC(N'
UPDATE c
SET c.[WilayaId] = w.[Id]
FROM [dbo].[Commune] c
INNER JOIN [dbo].[Wilaya] w ON w.[Code] = c.[WilayaCode]
WHERE c.[WilayaId] IS NULL;
');
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL
AND COL_LENGTH('dbo.Tap', 'CommuneCode') IS NOT NULL
AND COL_LENGTH('dbo.Commune', 'Code') IS NOT NULL
BEGIN
    EXEC(N'
UPDATE t
SET t.[CommuneId] = c.[Id]
FROM [dbo].[Tap] t
INNER JOIN [dbo].[Commune] c ON c.[Code] = t.[CommuneCode]
WHERE t.[CommuneId] IS NULL;
');
END
");

            migrationBuilder.Sql(@"
DECLARE @pkName NVARCHAR(256);
SELECT @pkName = kc.name
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'Wilaya';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE [dbo].[Wilaya] DROP CONSTRAINT [' + @pkName + ']');

SELECT @pkName = kc.name
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'Commune';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE [dbo].[Commune] DROP CONSTRAINT [' + @pkName + ']');

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.objects o ON kc.parent_object_id = o.object_id
    WHERE kc.type = 'PK' AND o.name = 'Wilaya'
)
    ALTER TABLE [dbo].[Wilaya] ADD CONSTRAINT [PK_Wilaya] PRIMARY KEY ([Id]);

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.objects o ON kc.parent_object_id = o.object_id
    WHERE kc.type = 'PK' AND o.name = 'Commune'
)
    ALTER TABLE [dbo].[Commune] ADD CONSTRAINT [PK_Commune] PRIMARY KEY ([Id]);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Wilaya', 'Code') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Wilaya_Code' AND object_id = OBJECT_ID(N'[dbo].[Wilaya]'))
    CREATE UNIQUE INDEX [UX_Wilaya_Code] ON [dbo].[Wilaya]([Code]);

IF COL_LENGTH('dbo.Commune', 'Code') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Commune_Code' AND object_id = OBJECT_ID(N'[dbo].[Commune]'))
    CREATE UNIQUE INDEX [UX_Commune_Code] ON [dbo].[Commune]([Code]);

IF COL_LENGTH('dbo.Commune', 'WilayaId') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM [dbo].[Commune] WHERE [WilayaId] IS NULL)
        THROW 51000, 'Migration blocked: some Commune rows cannot be mapped to Wilaya.Id.', 1;

    ALTER TABLE [dbo].[Commune] ALTER COLUMN [WilayaId] INT NOT NULL;
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Tap', 'CommuneId') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM [dbo].[Tap] WHERE [CommuneId] IS NULL)
        THROW 51000, 'Migration blocked: some Tap rows cannot be mapped to Commune.Id.', 1;

    ALTER TABLE [dbo].[Tap] ALTER COLUMN [CommuneId] INT NOT NULL;
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Commune_WilayaId' AND object_id = OBJECT_ID(N'[dbo].[Commune]'))
    CREATE INDEX [IX_Commune_WilayaId] ON [dbo].[Commune]([WilayaId]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Commune_Wilaya')
    ALTER TABLE [dbo].[Commune] WITH CHECK ADD CONSTRAINT [FK_Commune_Wilaya]
    FOREIGN KEY([WilayaId]) REFERENCES [dbo].[Wilaya]([Id]);

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tap_CommuneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]'))
        CREATE INDEX [IX_Tap_CommuneId] ON [dbo].[Tap]([CommuneId]);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Tap_Commune')
        ALTER TABLE [dbo].[Tap] WITH CHECK ADD CONSTRAINT [FK_Tap_Commune]
        FOREIGN KEY([CommuneId]) REFERENCES [dbo].[Commune]([Id]);
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Commune', 'WilayaCode') IS NOT NULL
    ALTER TABLE [dbo].[Commune] DROP COLUMN [WilayaCode];

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Tap', 'CommuneCode') IS NOT NULL
    ALTER TABLE [dbo].[Tap] DROP COLUMN [CommuneCode];
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
/* Down: restore code-based columns if needed (best effort only) */
IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Commune', 'WilayaCode') IS NULL
    ALTER TABLE [dbo].[Commune] ADD [WilayaCode] NVARCHAR(10) NULL;

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Tap', 'CommuneCode') IS NULL
    ALTER TABLE [dbo].[Tap] ADD [CommuneCode] NVARCHAR(20) NULL;

IF COL_LENGTH('dbo.Commune', 'WilayaCode') IS NOT NULL
BEGIN
    UPDATE c
    SET c.[WilayaCode] = w.[Code]
    FROM [dbo].[Commune] c
    INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId];
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH('dbo.Tap', 'CommuneCode') IS NOT NULL
BEGIN
    UPDATE t
    SET t.[CommuneCode] = c.[Code]
    FROM [dbo].[Tap] t
    INNER JOIN [dbo].[Commune] c ON c.[Id] = t.[CommuneId];
END
");
        }
    }
}
