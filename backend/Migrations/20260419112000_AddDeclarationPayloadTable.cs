using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419112000_AddDeclarationPayloadTable")]
    public partial class AddDeclarationPayloadTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[DeclarationPayload]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DeclarationPayload] (
        [DeclarationId] INT NOT NULL,
        [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationPayload_DataJson] DEFAULT (N'{}'),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationPayload_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DeclarationPayload] PRIMARY KEY ([DeclarationId])
    );
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_DeclarationPayload_Declaration'
      AND parent_object_id = OBJECT_ID(N'[dbo].[DeclarationPayload]')
)
BEGIN
    ALTER TABLE [dbo].[DeclarationPayload]
    ADD CONSTRAINT [FK_DeclarationPayload_Declaration]
        FOREIGN KEY ([DeclarationId]) REFERENCES [dbo].[Declaration]([Id]) ON DELETE CASCADE;
END

IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[DeclarationPayload] ([DeclarationId], [DataJson], [UpdatedAt])
    SELECT [d].[Id], [l].[DataJson], SYSUTCDATETIME()
    FROM [dbo].[Declaration] AS [d]
    INNER JOIN [dbo].[DeclarationLegacy] AS [l] ON [l].[Id] = [d].[Id]
    LEFT JOIN [dbo].[DeclarationPayload] AS [p] ON [p].[DeclarationId] = [d].[Id]
    WHERE [p].[DeclarationId] IS NULL
      AND [l].[DataJson] IS NOT NULL
      AND LTRIM(RTRIM([l].[DataJson])) <> N'';
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[DeclarationPayload]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[DeclarationPayload];
END
");
        }
    }
}
