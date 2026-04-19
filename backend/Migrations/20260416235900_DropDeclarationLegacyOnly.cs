using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using CheckFillingAPI.Data;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416235900_DropDeclarationLegacyOnly")]
    public partial class DropDeclarationLegacyOnly : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[DeclarationLegacy];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DeclarationLegacy] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] INT NOT NULL,
        [TabKey] NVARCHAR(50) NOT NULL,
        [Mois] NVARCHAR(10) NOT NULL,
        [Annee] NVARCHAR(10) NOT NULL,
        [Direction] NVARCHAR(200) NOT NULL,
        [DataJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_DeclarationLegacy_DataJson] DEFAULT (N'{}'),
        [IsApproved] BIT NOT NULL CONSTRAINT [DF_DeclarationLegacy_IsApproved] DEFAULT ((0)),
        [ApprovedByUserId] INT NULL,
        [ApprovedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationLegacy_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_DeclarationLegacy_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DeclarationLegacy] PRIMARY KEY ([Id])
    );

    CREATE INDEX [IX_DeclarationLegacy_UserId] ON [dbo].[DeclarationLegacy]([UserId]);
    CREATE INDEX [IX_DeclarationLegacy_UserId_TabKey_Mois_Annee] ON [dbo].[DeclarationLegacy]([UserId], [TabKey], [Mois], [Annee]);
    CREATE INDEX [IX_DeclarationLegacy_IsApproved] ON [dbo].[DeclarationLegacy]([IsApproved]);
    CREATE INDEX [IX_DeclarationLegacy_ApprovedByUserId] ON [dbo].[DeclarationLegacy]([ApprovedByUserId]);

    ALTER TABLE [dbo].[DeclarationLegacy]
    ADD CONSTRAINT [FK_DeclarationLegacy_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE;

    ALTER TABLE [dbo].[DeclarationLegacy]
    ADD CONSTRAINT [FK_DeclarationLegacy_Users_ApprovedByUserId]
        FOREIGN KEY ([ApprovedByUserId]) REFERENCES [dbo].[Users]([Id]);
END
");
        }
    }
}
