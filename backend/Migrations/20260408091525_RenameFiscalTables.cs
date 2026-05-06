using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    public partial class RenameFiscalTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =====================================================
            // SAFE DROP FOREIGN KEYS — tables externes vers Declaration
            // =====================================================

            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DeclarationPayload_Declaration')
    ALTER TABLE [DeclarationPayload] DROP CONSTRAINT [FK_DeclarationPayload_Declaration];
");

            // =====================================================
            // SAFE DROP FOREIGN KEYS — anciennes FK sur FiscalDeclarations / FiscalRecaps
            // =====================================================

            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FiscalDeclarations_Users_ApprovedByUserId')
    ALTER TABLE FiscalDeclarations DROP CONSTRAINT FK_FiscalDeclarations_Users_ApprovedByUserId;
");
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FiscalDeclarations_Users_UserId')
    ALTER TABLE FiscalDeclarations DROP CONSTRAINT FK_FiscalDeclarations_Users_UserId;
");
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FiscalRecaps_Users_UserId')
    ALTER TABLE FiscalRecaps DROP CONSTRAINT FK_FiscalRecaps_Users_UserId;
");

            // =====================================================
            // SAFE DROP FOREIGN KEYS — nouvelles FK (re-run idempotent)
            // =====================================================

            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Declaration_Users_ApprovedByUserId')
    ALTER TABLE [Declaration] DROP CONSTRAINT FK_Declaration_Users_ApprovedByUserId;
");
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Declaration_Users_UserId')
    ALTER TABLE [Declaration] DROP CONSTRAINT FK_Declaration_Users_UserId;
");
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_EtatsDeSortie_Users_UserId')
    ALTER TABLE [EtatsDeSortie] DROP CONSTRAINT FK_EtatsDeSortie_Users_UserId;
");

            // =====================================================
            // SAFE DROP PRIMARY KEYS (par table, pas par nom)
            // =====================================================

            migrationBuilder.Sql(@"
DECLARE @pkName NVARCHAR(256);
SELECT @pkName = kc.name 
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'FiscalDeclarations';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE FiscalDeclarations DROP CONSTRAINT [' + @pkName + ']');
");
            migrationBuilder.Sql(@"
DECLARE @pkName NVARCHAR(256);
SELECT @pkName = kc.name 
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'FiscalRecaps';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE FiscalRecaps DROP CONSTRAINT [' + @pkName + ']');
");
            migrationBuilder.Sql(@"
DECLARE @pkName NVARCHAR(256);
SELECT @pkName = kc.name 
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'Declaration';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE [Declaration] DROP CONSTRAINT [' + @pkName + ']');
");
            migrationBuilder.Sql(@"
DECLARE @pkName NVARCHAR(256);
SELECT @pkName = kc.name 
FROM sys.key_constraints kc
JOIN sys.objects o ON kc.parent_object_id = o.object_id
WHERE kc.type = 'PK' AND o.name = 'EtatsDeSortie';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE [EtatsDeSortie] DROP CONSTRAINT [' + @pkName + ']');
");

            // =====================================================
            // SAFE RENAME TABLES
            // =====================================================

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.FiscalDeclarations') IS NOT NULL 
AND OBJECT_ID('dbo.Declaration') IS NULL
    EXEC sp_rename 'dbo.FiscalDeclarations', 'Declaration';
");
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.FiscalRecaps') IS NOT NULL 
AND OBJECT_ID('dbo.EtatsDeSortie') IS NULL
    EXEC sp_rename 'dbo.FiscalRecaps', 'EtatsDeSortie';
");

            // =====================================================
            // RENAME INDEXES
            // =====================================================

            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalDeclarations_UserId_TabKey_Mois_Annee'
    AND o.name = 'Declaration'
)
    EXEC sp_rename 'dbo.Declaration.IX_FiscalDeclarations_UserId_TabKey_Mois_Annee', 'IX_Declaration_UserId_TabKey_Mois_Annee', 'INDEX';
");
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalDeclarations_UserId'
    AND o.name = 'Declaration'
)
    EXEC sp_rename 'dbo.Declaration.IX_FiscalDeclarations_UserId', 'IX_Declaration_UserId', 'INDEX';
");
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalDeclarations_IsApproved'
    AND o.name = 'Declaration'
)
    EXEC sp_rename 'dbo.Declaration.IX_FiscalDeclarations_IsApproved', 'IX_Declaration_IsApproved', 'INDEX';
");
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalDeclarations_ApprovedByUserId'
    AND o.name = 'Declaration'
)
    EXEC sp_rename 'dbo.Declaration.IX_FiscalDeclarations_ApprovedByUserId', 'IX_Declaration_ApprovedByUserId', 'INDEX';
");
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalRecaps_UserId'
    AND o.name = 'EtatsDeSortie'
)
    EXEC sp_rename 'dbo.EtatsDeSortie.IX_FiscalRecaps_UserId', 'IX_EtatsDeSortie_UserId', 'INDEX';
");
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.objects o ON i.object_id = o.object_id
    WHERE i.name = 'IX_FiscalRecaps_Key_Mois_Annee'
    AND o.name = 'EtatsDeSortie'
)
    EXEC sp_rename 'dbo.EtatsDeSortie.IX_FiscalRecaps_Key_Mois_Annee', 'IX_EtatsDeSortie_Key_Mois_Annee', 'INDEX';
");

            // =====================================================
            // PRIMARY KEYS RECREATION
            // =====================================================

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.objects o ON kc.parent_object_id = o.object_id
    WHERE kc.type = 'PK' AND o.name = 'Declaration'
)
    ALTER TABLE [Declaration] ADD CONSTRAINT [PK_Declaration] PRIMARY KEY ([Id]);
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.objects o ON kc.parent_object_id = o.object_id
    WHERE kc.type = 'PK' AND o.name = 'EtatsDeSortie'
)
    ALTER TABLE [EtatsDeSortie] ADD CONSTRAINT [PK_EtatsDeSortie] PRIMARY KEY ([Id]);
");

            // =====================================================
            // FOREIGN KEYS RECREATION — Users
            // =====================================================

            // Ensure approval workflow columns exist on Declaration before adding FKs
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NULL
    ALTER TABLE [Declaration] ADD [ApprovedByUserId] INT NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.Declaration', N'ApprovedAt') IS NULL
    ALTER TABLE [Declaration] ADD [ApprovedAt] datetime2 NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.Declaration', N'IsApproved') IS NULL
    ALTER TABLE [Declaration] ADD [IsApproved] bit NOT NULL DEFAULT(0);
");
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.Declaration', N'UserId') IS NULL
    ALTER TABLE [Declaration] ADD [UserId] INT NOT NULL DEFAULT(0);
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Declaration_ApprovedByUserId'
      AND object_id = OBJECT_ID(N'dbo.Declaration')
)
    CREATE INDEX [IX_Declaration_ApprovedByUserId] ON [dbo].[Declaration]([ApprovedByUserId]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Declaration_Users_ApprovedByUserId')
    ALTER TABLE [Declaration] ADD CONSTRAINT [FK_Declaration_Users_ApprovedByUserId]
        FOREIGN KEY ([ApprovedByUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Declaration_Users_UserId')
    ALTER TABLE [Declaration] ADD CONSTRAINT [FK_Declaration_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE;
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_EtatsDeSortie_Users_UserId')
    ALTER TABLE [EtatsDeSortie] ADD CONSTRAINT [FK_EtatsDeSortie_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE;
");

            // =====================================================
            // FOREIGN KEY RECREATION — DeclarationPayload -> Declaration
            // =====================================================

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DeclarationPayload_Declaration')
    ALTER TABLE [DeclarationPayload] ADD CONSTRAINT [FK_DeclarationPayload_Declaration]
        FOREIGN KEY ([DeclarationId]) REFERENCES [Declaration]([Id]) ON DELETE CASCADE;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DeclarationPayload_Declaration')
    ALTER TABLE [DeclarationPayload] DROP CONSTRAINT [FK_DeclarationPayload_Declaration];
");

            migrationBuilder.DropForeignKey(
                name: "FK_Declaration_Users_ApprovedByUserId",
                table: "Declaration");

            migrationBuilder.DropForeignKey(
                name: "FK_Declaration_Users_UserId",
                table: "Declaration");

            migrationBuilder.DropForeignKey(
                name: "FK_EtatsDeSortie_Users_UserId",
                table: "EtatsDeSortie");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Declaration",
                table: "Declaration");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EtatsDeSortie",
                table: "EtatsDeSortie");

            migrationBuilder.RenameTable(
                name: "Declaration",
                newName: "FiscalDeclarations");

            migrationBuilder.RenameTable(
                name: "EtatsDeSortie",
                newName: "FiscalRecaps");

            migrationBuilder.RenameIndex(
                name: "IX_Declaration_UserId_TabKey_Mois_Annee",
                table: "FiscalDeclarations",
                newName: "IX_FiscalDeclarations_UserId_TabKey_Mois_Annee");

            migrationBuilder.RenameIndex(
                name: "IX_Declaration_UserId",
                table: "FiscalDeclarations",
                newName: "IX_FiscalDeclarations_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Declaration_IsApproved",
                table: "FiscalDeclarations",
                newName: "IX_FiscalDeclarations_IsApproved");

            migrationBuilder.RenameIndex(
                name: "IX_Declaration_ApprovedByUserId",
                table: "FiscalDeclarations",
                newName: "IX_FiscalDeclarations_ApprovedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_EtatsDeSortie_UserId",
                table: "FiscalRecaps",
                newName: "IX_FiscalRecaps_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_EtatsDeSortie_Key_Mois_Annee",
                table: "FiscalRecaps",
                newName: "IX_FiscalRecaps_Key_Mois_Annee");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FiscalDeclarations",
                table: "FiscalDeclarations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FiscalRecaps",
                table: "FiscalRecaps",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FiscalDeclarations_Users_ApprovedByUserId",
                table: "FiscalDeclarations",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FiscalDeclarations_Users_UserId",
                table: "FiscalDeclarations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FiscalRecaps_Users_UserId",
                table: "FiscalRecaps",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DeclarationPayload_Declaration')
    ALTER TABLE [DeclarationPayload] ADD CONSTRAINT [FK_DeclarationPayload_Declaration]
        FOREIGN KEY ([DeclarationId]) REFERENCES [FiscalDeclarations]([Id]) ON DELETE CASCADE;
");
        }
    }
}