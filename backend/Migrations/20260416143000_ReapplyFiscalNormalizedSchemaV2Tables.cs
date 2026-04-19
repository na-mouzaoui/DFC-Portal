using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416143000_ReapplyFiscalNormalizedSchemaV2Tables")]
    public partial class ReapplyFiscalNormalizedSchemaV2Tables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
AND OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NULL
BEGIN
    EXEC sp_rename N'dbo.Declaration', N'DeclarationLegacy';
END

IF OBJECT_ID(N'[dbo].[Periode]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Periode] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Mois] INT NOT NULL,
        [Annee] INT NOT NULL
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Periode_Mois_Annee' AND object_id = OBJECT_ID(N'[dbo].[Periode]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_Periode_Mois_Annee] ON [dbo].[Periode] ([Mois], [Annee]);
END

IF OBJECT_ID(N'[dbo].[Wilaya]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Wilaya] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Nom] NVARCHAR(100) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Commune] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [WilayaId] INT NOT NULL,
        [Nom] NVARCHAR(100) NOT NULL,
        CONSTRAINT [FK_Commune_Wilaya] FOREIGN KEY ([WilayaId]) REFERENCES [dbo].[Wilaya]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Commune_WilayaId' AND object_id = OBJECT_ID(N'[dbo].[Commune]')
)
BEGIN
    CREATE INDEX [IX_Commune_WilayaId] ON [dbo].[Commune]([WilayaId]);
END

IF OBJECT_ID(N'[dbo].[Fournisseur]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Fournisseur] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Nom] NVARCHAR(255) NOT NULL,
        [EstEtranger] BIT NOT NULL,
        [NIF] NVARCHAR(50) NULL,
        [RC] NVARCHAR(50) NULL,
        [Adresse] NVARCHAR(255) NULL
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Fournisseur_NIF_Adresse' AND object_id = OBJECT_ID(N'[dbo].[Fournisseur]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_Fournisseur_NIF_Adresse]
    ON [dbo].[Fournisseur]([NIF], [Adresse])
    WHERE [NIF] IS NOT NULL AND [Adresse] IS NOT NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Fournisseur_Nom' AND object_id = OBJECT_ID(N'[dbo].[Fournisseur]')
)
BEGIN
    CREATE INDEX [IX_Fournisseur_Nom] ON [dbo].[Fournisseur]([Nom]);
END

IF OBJECT_ID(N'[dbo].[Facture]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Facture] (
        [IdFournisseur] INT NOT NULL,
        [NumFacture] NVARCHAR(50) NOT NULL,
        [DateFacture] DATE NOT NULL,
        [MontantHT] DECIMAL(18,2) NULL,
        [TVA] DECIMAL(18,2) NULL,
        [MontantTTC] DECIMAL(18,2) NULL,
        CONSTRAINT [PK_Facture] PRIMARY KEY ([IdFournisseur], [NumFacture], [DateFacture]),
        CONSTRAINT [FK_Facture_Fournisseur] FOREIGN KEY ([IdFournisseur]) REFERENCES [dbo].[Fournisseur]([Id])
    );
END

IF OBJECT_ID(N'[dbo].[EncaissementLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EncaissementLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Encaissement]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Encaissement] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [EncaissementLigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [MontantHT] DECIMAL(18,2) NULL,
        [MontantTVA] DECIMAL(18,2) NULL,
        [MontantTTC] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Encaissement_EncaissementLigne] FOREIGN KEY ([EncaissementLigneId]) REFERENCES [dbo].[EncaissementLigne]([Id]),
        CONSTRAINT [FK_Encaissement_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Encaissement_EncaissementLigneId' AND object_id = OBJECT_ID(N'[dbo].[Encaissement]')
)
BEGIN
    CREATE INDEX [IX_Encaissement_EncaissementLigneId] ON [dbo].[Encaissement]([EncaissementLigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Encaissement_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Encaissement]')
)
BEGIN
    CREATE INDEX [IX_Encaissement_PeriodeId] ON [dbo].[Encaissement]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[Tva]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Tva] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [IdFournisseur] INT NOT NULL,
        [NumFacture] NVARCHAR(50) NOT NULL,
        [DateFacture] DATE NOT NULL,
        [PeriodeId] INT NOT NULL,
        [Type] NVARCHAR(20) NOT NULL,
        CONSTRAINT [FK_Tva_Facture] FOREIGN KEY ([IdFournisseur], [NumFacture], [DateFacture]) REFERENCES [dbo].[Facture]([IdFournisseur], [NumFacture], [DateFacture]),
        CONSTRAINT [FK_Tva_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Tva_Type' AND parent_object_id = OBJECT_ID(N'[dbo].[Tva]')
)
BEGIN
    ALTER TABLE [dbo].[Tva]
    ADD CONSTRAINT [CK_Tva_Type] CHECK ([Type] IN ('IMMO', 'BS'));
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tva_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Tva]')
)
BEGIN
    CREATE INDEX [IX_Tva_PeriodeId] ON [dbo].[Tva]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tva_FactureRef' AND object_id = OBJECT_ID(N'[dbo].[Tva]')
)
BEGIN
    CREATE INDEX [IX_Tva_FactureRef] ON [dbo].[Tva]([IdFournisseur], [NumFacture], [DateFacture]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tva_PeriodeId_Type' AND object_id = OBJECT_ID(N'[dbo].[Tva]')
)
BEGIN
    CREATE INDEX [IX_Tva_PeriodeId_Type] ON [dbo].[Tva]([PeriodeId], [Type]);
END

IF OBJECT_ID(N'[dbo].[TimbreLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TimbreLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Timbre]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Timbre] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [TimbreLigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [ChiffreAffaireTTC] DECIMAL(18,2) NULL,
        [DroitTimbre] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Timbre_TimbreLigne] FOREIGN KEY ([TimbreLigneId]) REFERENCES [dbo].[TimbreLigne]([Id]),
        CONSTRAINT [FK_Timbre_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Timbre_TimbreLigneId' AND object_id = OBJECT_ID(N'[dbo].[Timbre]')
)
BEGIN
    CREATE INDEX [IX_Timbre_TimbreLigneId] ON [dbo].[Timbre]([TimbreLigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Timbre_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Timbre]')
)
BEGIN
    CREATE INDEX [IX_Timbre_PeriodeId] ON [dbo].[Timbre]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[Ca71Ligne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Ca71Ligne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Ca71]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Ca71] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [MontantCA] DECIMAL(18,2) NULL,
        [MontantTaxe] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Ca71_Ca71Ligne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[Ca71Ligne]([Id]),
        CONSTRAINT [FK_Ca71_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Ca71_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Ca71]')
)
BEGIN
    CREATE INDEX [IX_Ca71_LigneId] ON [dbo].[Ca71]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Ca71_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Ca71]')
)
BEGIN
    CREATE INDEX [IX_Ca71_PeriodeId] ON [dbo].[Ca71]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[TapLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TapLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Tap] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [CommuneId] INT NOT NULL,
        [MontantImposable] DECIMAL(18,2) NULL,
        [MontantTAP] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Tap_TapLigne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[TapLigne]([Id]),
        CONSTRAINT [FK_Tap_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]),
        CONSTRAINT [FK_Tap_Commune] FOREIGN KEY ([CommuneId]) REFERENCES [dbo].[Commune]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    CREATE INDEX [IX_Tap_LigneId] ON [dbo].[Tap]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    CREATE INDEX [IX_Tap_PeriodeId] ON [dbo].[Tap]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_CommuneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    CREATE INDEX [IX_Tap_CommuneId] ON [dbo].[Tap]([CommuneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tap_PeriodeId_CommuneId' AND object_id = OBJECT_ID(N'[dbo].[Tap]')
)
BEGIN
    CREATE INDEX [IX_Tap_PeriodeId_CommuneId] ON [dbo].[Tap]([PeriodeId], [CommuneId]);
END

IF OBJECT_ID(N'[dbo].[CaSiegeLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CaSiegeLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[CaSiege]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CaSiege] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [MontantHT] DECIMAL(18,2) NULL,
        [MontantTTC] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_CaSiege_CaSiegeLigne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[CaSiegeLigne]([Id]),
        CONSTRAINT [FK_CaSiege_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_CaSiege_LigneId' AND object_id = OBJECT_ID(N'[dbo].[CaSiege]')
)
BEGIN
    CREATE INDEX [IX_CaSiege_LigneId] ON [dbo].[CaSiege]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_CaSiege_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[CaSiege]')
)
BEGIN
    CREATE INDEX [IX_CaSiege_PeriodeId] ON [dbo].[CaSiege]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[IrgLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IrgLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Irg]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Irg] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [AssietteImposable] DECIMAL(18,2) NULL,
        [Montant] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Irg_IrgLigne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[IrgLigne]([Id]),
        CONSTRAINT [FK_Irg_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Irg_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Irg]')
)
BEGIN
    CREATE INDEX [IX_Irg_LigneId] ON [dbo].[Irg]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Irg_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Irg]')
)
BEGIN
    CREATE INDEX [IX_Irg_PeriodeId] ON [dbo].[Irg]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[Taxe2]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Taxe2] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [BaseMontant] DECIMAL(18,2) NULL,
        [MontantTaxe] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Taxe2_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Taxe2_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Taxe2]')
)
BEGIN
    CREATE INDEX [IX_Taxe2_PeriodeId] ON [dbo].[Taxe2]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[TaxeMaster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TaxeMaster] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [DateFacture] DATE NULL,
        [Nom] NVARCHAR(255) NULL,
        [NumFacture] NVARCHAR(50) NULL,
        [MontantHT] DECIMAL(18,2) NULL,
        [Taxe] DECIMAL(18,2) NULL,
        [Mois] INT NULL,
        [Observation] NVARCHAR(255) NULL,
        CONSTRAINT [FK_TaxeMaster_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_TaxeMaster_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[TaxeMaster]')
)
BEGIN
    CREATE INDEX [IX_TaxeMaster_PeriodeId] ON [dbo].[TaxeMaster]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_TaxeMaster_PeriodeId_Mois' AND object_id = OBJECT_ID(N'[dbo].[TaxeMaster]')
)
BEGIN
    CREATE INDEX [IX_TaxeMaster_PeriodeId_Mois] ON [dbo].[TaxeMaster]([PeriodeId], [Mois]);
END

IF OBJECT_ID(N'[dbo].[TaxeVehicule]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TaxeVehicule] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [Montant] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_TaxeVehicule_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_TaxeVehicule_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[TaxeVehicule]')
)
BEGIN
    CREATE INDEX [IX_TaxeVehicule_PeriodeId] ON [dbo].[TaxeVehicule]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[FormationLigne]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[FormationLigne] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Designation] NVARCHAR(255) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[Formation]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Formation] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LigneId] INT NOT NULL,
        [PeriodeId] INT NOT NULL,
        [Montant] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Formation_FormationLigne] FOREIGN KEY ([LigneId]) REFERENCES [dbo].[FormationLigne]([Id]),
        CONSTRAINT [FK_Formation_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Formation_LigneId' AND object_id = OBJECT_ID(N'[dbo].[Formation]')
)
BEGIN
    CREATE INDEX [IX_Formation_LigneId] ON [dbo].[Formation]([LigneId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Formation_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Formation]')
)
BEGIN
    CREATE INDEX [IX_Formation_PeriodeId] ON [dbo].[Formation]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AcompteProvisionel] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [Montant] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_AcompteProvisionel_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AcompteProvisionel_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[AcompteProvisionel]')
)
BEGIN
    CREATE INDEX [IX_AcompteProvisionel_PeriodeId] ON [dbo].[AcompteProvisionel]([PeriodeId]);
END

IF OBJECT_ID(N'[dbo].[Ibs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Ibs] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [FournisseurId] INT NOT NULL,
        [NumFacture] NVARCHAR(50) NULL,
        [MontantBrutDevise] DECIMAL(18,5) NULL,
        [MontantBrutDinars] DECIMAL(18,2) NULL,
        [MontantNetTransferableDevise] DECIMAL(18,5) NULL,
        [MontantIBS] DECIMAL(18,2) NULL,
        [MontantNetTransferableDinars] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Ibs_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]),
        CONSTRAINT [FK_Ibs_Fournisseur] FOREIGN KEY ([FournisseurId]) REFERENCES [dbo].[Fournisseur]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Ibs_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Ibs]')
)
BEGIN
    CREATE INDEX [IX_Ibs_PeriodeId] ON [dbo].[Ibs]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Ibs_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[Ibs]')
)
BEGIN
    CREATE INDEX [IX_Ibs_FournisseurId] ON [dbo].[Ibs]([FournisseurId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Ibs_PeriodeId_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[Ibs]')
)
BEGIN
    CREATE INDEX [IX_Ibs_PeriodeId_FournisseurId] ON [dbo].[Ibs]([PeriodeId], [FournisseurId]);
END

IF OBJECT_ID(N'[dbo].[Domiciliation]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Domiciliation] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [FournisseurId] INT NOT NULL,
        [NumFacture] NVARCHAR(50) NULL,
        [DateFacture] DATE NULL,
        [MontantNetDevise] DECIMAL(18,5) NULL,
        [Devise] NVARCHAR(10) NULL,
        [TauxChange] DECIMAL(18,5) NULL,
        [MontantDinars] DECIMAL(18,2) NULL,
        [TauxTaxe] DECIMAL(5,2) NULL,
        [MontantAPayerDinars] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_Domiciliation_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]),
        CONSTRAINT [FK_Domiciliation_Fournisseur] FOREIGN KEY ([FournisseurId]) REFERENCES [dbo].[Fournisseur]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Domiciliation_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[Domiciliation]')
)
BEGIN
    CREATE INDEX [IX_Domiciliation_PeriodeId] ON [dbo].[Domiciliation]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Domiciliation_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[Domiciliation]')
)
BEGIN
    CREATE INDEX [IX_Domiciliation_FournisseurId] ON [dbo].[Domiciliation]([FournisseurId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Domiciliation_PeriodeId_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[Domiciliation]')
)
BEGIN
    CREATE INDEX [IX_Domiciliation_PeriodeId_FournisseurId] ON [dbo].[Domiciliation]([PeriodeId], [FournisseurId]);
END

IF OBJECT_ID(N'[dbo].[AutoLiquidation]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AutoLiquidation] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [FournisseurId] INT NOT NULL,
        [NumFacture] NVARCHAR(50) NULL,
        [MontantBrutDevise] DECIMAL(18,5) NULL,
        [MontantBrutDinars] DECIMAL(18,2) NULL,
        [TauxChange] DECIMAL(18,5) NULL,
        [TVA19] DECIMAL(18,2) NULL,
        CONSTRAINT [FK_AutoLiquidation_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]),
        CONSTRAINT [FK_AutoLiquidation_Fournisseur] FOREIGN KEY ([FournisseurId]) REFERENCES [dbo].[Fournisseur]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AutoLiquidation_PeriodeId' AND object_id = OBJECT_ID(N'[dbo].[AutoLiquidation]')
)
BEGIN
    CREATE INDEX [IX_AutoLiquidation_PeriodeId] ON [dbo].[AutoLiquidation]([PeriodeId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AutoLiquidation_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[AutoLiquidation]')
)
BEGIN
    CREATE INDEX [IX_AutoLiquidation_FournisseurId] ON [dbo].[AutoLiquidation]([FournisseurId]);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AutoLiquidation_PeriodeId_FournisseurId' AND object_id = OBJECT_ID(N'[dbo].[AutoLiquidation]')
)
BEGIN
    CREATE INDEX [IX_AutoLiquidation_PeriodeId_FournisseurId] ON [dbo].[AutoLiquidation]([PeriodeId], [FournisseurId]);
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NULL
AND OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NULL
BEGIN
    EXEC sp_rename N'dbo.Declaration', N'DeclarationLegacy';
END

IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Declaration] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PeriodeId] INT NOT NULL,
        [Direction] NVARCHAR(120) NOT NULL,
        [TableauCode] NVARCHAR(30) NOT NULL,
        [Statut] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Declaration_Statut] DEFAULT ('PENDING'),
        [LastModifiedByUserId] INT NOT NULL,
        [ApprovedByUserId] INT NULL,
        [SubmittedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Declaration_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
        [RowVersion] ROWVERSION NOT NULL,
        CONSTRAINT [FK_Declaration_Periode] FOREIGN KEY ([PeriodeId]) REFERENCES [dbo].[Periode]([Id]),
        CONSTRAINT [FK_Declaration_LastModifiedBy] FOREIGN KEY ([LastModifiedByUserId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_Declaration_ApprovedBy] FOREIGN KEY ([ApprovedByUserId]) REFERENCES [dbo].[Users]([Id])
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Declaration_Statut' AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
BEGIN
    EXEC(N'ALTER TABLE [dbo].[Declaration] ADD CONSTRAINT [CK_Declaration_Statut] CHECK ([Statut] IN (''PENDING'', ''APPROVED''));');
END

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Declaration_ApprovalConsistency' AND parent_object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NOT NULL
BEGIN
    EXEC(N'ALTER TABLE [dbo].[Declaration] ADD CONSTRAINT [CK_Declaration_ApprovalConsistency] CHECK (([Statut] = ''PENDING'' AND [ApprovedByUserId] IS NULL) OR ([Statut] = ''APPROVED'' AND [ApprovedByUserId] IS NOT NULL));');
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Declaration_Periode_Direction_Tableau' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Direction') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'TableauCode') IS NOT NULL
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_Declaration_Periode_Direction_Tableau] ON [dbo].[Declaration]([PeriodeId], [Direction], [TableauCode]);');
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_Worklist' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'PeriodeId') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Statut') IS NOT NULL
AND COL_LENGTH(N'dbo.Declaration', N'Direction') IS NOT NULL
BEGIN
    EXEC(N'CREATE INDEX [IX_Declaration_Worklist] ON [dbo].[Declaration]([PeriodeId], [Statut], [Direction]);');
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_LastModifiedBy' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'LastModifiedByUserId') IS NOT NULL
BEGIN
    EXEC(N'CREATE INDEX [IX_Declaration_LastModifiedBy] ON [dbo].[Declaration]([LastModifiedByUserId]);');
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Declaration_ApprovedBy' AND object_id = OBJECT_ID(N'[dbo].[Declaration]')
)
AND COL_LENGTH(N'dbo.Declaration', N'ApprovedByUserId') IS NOT NULL
BEGIN
    EXEC(N'CREATE INDEX [IX_Declaration_ApprovedBy] ON [dbo].[Declaration]([ApprovedByUserId]);');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NOT NULL DROP TABLE [dbo].[Declaration];
IF OBJECT_ID(N'[dbo].[AutoLiquidation]', N'U') IS NOT NULL DROP TABLE [dbo].[AutoLiquidation];
IF OBJECT_ID(N'[dbo].[Domiciliation]', N'U') IS NOT NULL DROP TABLE [dbo].[Domiciliation];
IF OBJECT_ID(N'[dbo].[Ibs]', N'U') IS NOT NULL DROP TABLE [dbo].[Ibs];
IF OBJECT_ID(N'[dbo].[AcompteProvisionel]', N'U') IS NOT NULL DROP TABLE [dbo].[AcompteProvisionel];
IF OBJECT_ID(N'[dbo].[Formation]', N'U') IS NOT NULL DROP TABLE [dbo].[Formation];
IF OBJECT_ID(N'[dbo].[FormationLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[FormationLigne];
IF OBJECT_ID(N'[dbo].[TaxeVehicule]', N'U') IS NOT NULL DROP TABLE [dbo].[TaxeVehicule];
IF OBJECT_ID(N'[dbo].[TaxeMaster]', N'U') IS NOT NULL DROP TABLE [dbo].[TaxeMaster];
IF OBJECT_ID(N'[dbo].[Taxe2]', N'U') IS NOT NULL DROP TABLE [dbo].[Taxe2];
IF OBJECT_ID(N'[dbo].[Irg]', N'U') IS NOT NULL DROP TABLE [dbo].[Irg];
IF OBJECT_ID(N'[dbo].[IrgLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[IrgLigne];
IF OBJECT_ID(N'[dbo].[CaSiege]', N'U') IS NOT NULL DROP TABLE [dbo].[CaSiege];
IF OBJECT_ID(N'[dbo].[CaSiegeLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[CaSiegeLigne];
IF OBJECT_ID(N'[dbo].[Tap]', N'U') IS NOT NULL DROP TABLE [dbo].[Tap];
IF OBJECT_ID(N'[dbo].[TapLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[TapLigne];
IF OBJECT_ID(N'[dbo].[Ca71]', N'U') IS NOT NULL DROP TABLE [dbo].[Ca71];
IF OBJECT_ID(N'[dbo].[Ca71Ligne]', N'U') IS NOT NULL DROP TABLE [dbo].[Ca71Ligne];
IF OBJECT_ID(N'[dbo].[Timbre]', N'U') IS NOT NULL DROP TABLE [dbo].[Timbre];
IF OBJECT_ID(N'[dbo].[TimbreLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[TimbreLigne];
IF OBJECT_ID(N'[dbo].[Tva]', N'U') IS NOT NULL DROP TABLE [dbo].[Tva];
IF OBJECT_ID(N'[dbo].[Encaissement]', N'U') IS NOT NULL DROP TABLE [dbo].[Encaissement];
IF OBJECT_ID(N'[dbo].[EncaissementLigne]', N'U') IS NOT NULL DROP TABLE [dbo].[EncaissementLigne];
IF OBJECT_ID(N'[dbo].[Facture]', N'U') IS NOT NULL DROP TABLE [dbo].[Facture];
IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NOT NULL DROP TABLE [dbo].[Commune];
IF OBJECT_ID(N'[dbo].[Wilaya]', N'U') IS NOT NULL DROP TABLE [dbo].[Wilaya];
IF OBJECT_ID(N'[dbo].[Fournisseur]', N'U') IS NOT NULL DROP TABLE [dbo].[Fournisseur];
IF OBJECT_ID(N'[dbo].[Periode]', N'U') IS NOT NULL DROP TABLE [dbo].[Periode];

IF OBJECT_ID(N'[dbo].[DeclarationLegacy]', N'U') IS NOT NULL
AND OBJECT_ID(N'[dbo].[Declaration]', N'U') IS NULL
BEGIN
    EXEC sp_rename N'dbo.DeclarationLegacy', N'Declaration';
END
");
        }
    }
}
