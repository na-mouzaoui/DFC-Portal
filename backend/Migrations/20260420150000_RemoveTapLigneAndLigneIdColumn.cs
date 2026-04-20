using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTapLigneAndLigneIdColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key constraint
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_Tap_TapLigne' AND parent_object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    ALTER TABLE [dbo].[Tap] DROP CONSTRAINT [FK_Tap_TapLigne];
END
");

            // Drop index on LigneId
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    DROP INDEX [IX_Tap_LigneId] ON [dbo].[Tap];
END
");

            // Drop LigneId column
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tap', N'LigneId') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Tap] DROP COLUMN [LigneId];
END
");

            // Drop TapLigne table
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TapLigne]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[TapLigne];
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Recreate TapLigne table
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[TapLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TapLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END
");

            // Add LigneId column back
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Tap', N'LigneId') IS NULL
BEGIN
    ALTER TABLE [dbo].[Tap] ADD [LigneId] INT NOT NULL CONSTRAINT [DF_Tap_LigneId] DEFAULT(1);
END
");

            // Recreate foreign key constraint
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_Tap_TapLigne' AND parent_object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    ALTER TABLE [dbo].[Tap] ADD CONSTRAINT [FK_Tap_TapLigne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[TapLigne]([Id]);
END
");

            // Recreate index
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    CREATE INDEX [IX_Tap_LigneId] ON [dbo].[Tap]([LigneId]);
END
");
        }
    }
}
