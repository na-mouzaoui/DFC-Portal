using CheckFillingAPI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CheckFillingAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260420123000_SeedWilayaCommuneFromFrontData")]
    public partial class SeedWilayaCommuneFromFrontData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[Wilaya]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Adrar')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Adrar');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Chlef');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Laghouat')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Laghouat');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oum El Bouaghi')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Oum El Bouaghi');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Batna')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Batna');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béjaïa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Béjaïa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Biskra')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Biskra');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béchar')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Béchar');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Blida')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Blida');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bouira')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Bouira');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tamanrasset')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tamanrasset');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tébessa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tébessa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tlemcen')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tlemcen');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tiaret')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tiaret');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tizi Ouzou')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tizi Ouzou');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Alger');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Djelfa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Djelfa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Jijel')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Jijel');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sétif')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Sétif');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Saïda')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Saïda');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Skikda')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Skikda');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sidi Bel Abbès')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Sidi Bel Abbès');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Annaba')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Annaba');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Guelma')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Guelma');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Constantine')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Constantine');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Médéa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Médéa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mostaganem')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Mostaganem');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'M''Sila')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'M''Sila');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mascara')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Mascara');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ouargla')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ouargla');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oran')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Oran');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Bayadh')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Bayadh');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Illizi')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Illizi');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bordj Bou Arreridj')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Bordj Bou Arreridj');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Boumerdès')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Boumerdès');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Tarf')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Tarf');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tindouf')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tindouf');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tissemsilt')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tissemsilt');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Oued')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Oued');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Khenchela')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Khenchela');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Souk Ahras')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Souk Ahras');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tipaza')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Tipaza');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mila')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Mila');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Defla')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Aïn Defla');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Naâma')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Naâma');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Témouchent')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Aïn Témouchent');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ghardaïa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ghardaïa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Relizane')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Relizane');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Timimoun')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Timimoun');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bordj Badji Mokhtar')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Bordj Badji Mokhtar');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ouled Djellal')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ouled Djellal');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béni Abbès')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Béni Abbès');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'In Salah')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'In Salah');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'In Guezzam')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'In Guezzam');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Touggourt')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Touggourt');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Djanet')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Djanet');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El M''Ghair')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El M''Ghair');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Meniaa')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Meniaa');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aflou')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Aflou');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Abiodh Sidi Cheikh')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Abiodh Sidi Cheikh');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Aricha')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Aricha');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Kantara')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'El Kantara');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Barika')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Barika');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bou Saada')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Bou Saada');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bir El Ater')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Bir El Ater');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ksar El Boukhari')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ksar El Boukhari');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ksar Chellala')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ksar Chellala');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ain Oussara')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Ain Oussara');
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Messaad')
        INSERT INTO [dbo].[Wilaya] ([Nom]) VALUES (N'Messaad');
END

IF OBJECT_ID(N'[dbo].[Commune]', N'U') IS NOT NULL AND OBJECT_ID(N'[dbo].[Wilaya]', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Adrar') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Adrar' AND c.[Nom] = N'101'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'101' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Adrar';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Adrar') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Adrar' AND c.[Nom] = N'104'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'104' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Adrar';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Adrar') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Adrar' AND c.[Nom] = N'109'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'109' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Adrar';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Chlef' AND c.[Nom] = N'201'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'201' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Chlef';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Chlef' AND c.[Nom] = N'229'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'229' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Chlef';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Chlef' AND c.[Nom] = N'202'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'202' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Chlef';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Chlef' AND c.[Nom] = N'224'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'224' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Chlef';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Chlef') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Chlef' AND c.[Nom] = N'212'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'212' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Chlef';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oum El Bouaghi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oum El Bouaghi' AND c.[Nom] = N'425'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'425' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oum El Bouaghi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oum El Bouaghi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oum El Bouaghi' AND c.[Nom] = N'403'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'403' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oum El Bouaghi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oum El Bouaghi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oum El Bouaghi' AND c.[Nom] = N'402'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'402' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oum El Bouaghi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oum El Bouaghi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oum El Bouaghi' AND c.[Nom] = N'401'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'401' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oum El Bouaghi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Batna') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Batna' AND c.[Nom] = N'545'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'545' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Batna';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Batna') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Batna' AND c.[Nom] = N'501'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'501' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Batna';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béjaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béjaïa' AND c.[Nom] = N'601'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'601' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béjaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béjaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béjaïa' AND c.[Nom] = N'644'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'644' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béjaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béjaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béjaïa' AND c.[Nom] = N'625'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'625' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béjaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béjaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béjaïa' AND c.[Nom] = N'602'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'602' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béjaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Biskra') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Biskra' AND c.[Nom] = N'701'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'701' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Biskra';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Biskra') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Biskra' AND c.[Nom] = N'721'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'721' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Biskra';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béchar') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béchar' AND c.[Nom] = N'817'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'817' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béchar';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béchar') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béchar' AND c.[Nom] = N'801'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'801' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béchar';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Blida') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Blida' AND c.[Nom] = N'904'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'904' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Blida';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Blida') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Blida' AND c.[Nom] = N'901'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'901' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Blida';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Blida') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Blida' AND c.[Nom] = N'907'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'907' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Blida';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Blida') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Blida' AND c.[Nom] = N'920'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'920' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Blida';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bouira') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Bouira' AND c.[Nom] = N'1001'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1001' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Bouira';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tamanrasset') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tamanrasset' AND c.[Nom] = N'1101'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1101' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tamanrasset';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tamanrasset') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tamanrasset' AND c.[Nom] = N'1108'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1108' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tamanrasset';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tébessa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tébessa' AND c.[Nom] = N'1202'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1202' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tébessa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tébessa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tébessa' AND c.[Nom] = N'1201'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1201' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tébessa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tébessa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tébessa' AND c.[Nom] = N'1209'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1209' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tébessa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tébessa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tébessa' AND c.[Nom] = N'1219'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1219' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tébessa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tlemcen') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tlemcen' AND c.[Nom] = N'1304'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1304' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tlemcen';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tlemcen') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tlemcen' AND c.[Nom] = N'1301'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1301' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tlemcen';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tlemcen') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tlemcen' AND c.[Nom] = N'1327'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1327' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tlemcen';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tiaret') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tiaret' AND c.[Nom] = N'1427'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1427' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tiaret';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tiaret') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tiaret' AND c.[Nom] = N'1401'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1401' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tiaret';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tiaret') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tiaret' AND c.[Nom] = N'1429'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1429' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tiaret';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tizi Ouzou') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tizi Ouzou' AND c.[Nom] = N'1501'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1501' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tizi Ouzou';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tizi Ouzou') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tizi Ouzou' AND c.[Nom] = N'1518'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1518' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tizi Ouzou';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1605'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1605' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1607'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1607' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1617'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1617' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1618'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1618' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1620'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1620' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1621'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1621' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1642'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1642' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1613'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1613' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1628'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1628' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1653'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1653' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1623'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1623' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1646'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1646' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1644'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1644' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Alger') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Alger' AND c.[Nom] = N'1610'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1610' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Alger';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Djelfa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Djelfa' AND c.[Nom] = N'1731'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1731' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Djelfa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Djelfa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Djelfa' AND c.[Nom] = N'1717'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1717' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Djelfa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Djelfa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Djelfa' AND c.[Nom] = N'1701'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1701' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Djelfa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Jijel') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Jijel' AND c.[Nom] = N'1809'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1809' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Jijel';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Jijel') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Jijel' AND c.[Nom] = N'1801'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1801' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Jijel';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Jijel') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Jijel' AND c.[Nom] = N'1805'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1805' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Jijel';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sétif') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sétif' AND c.[Nom] = N'1943'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1943' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sétif';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sétif') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sétif' AND c.[Nom] = N'1920'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1920' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sétif';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sétif') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sétif' AND c.[Nom] = N'1928'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1928' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sétif';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sétif') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sétif' AND c.[Nom] = N'1901'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'1901' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sétif';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Saïda') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Saïda' AND c.[Nom] = N'2001'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2001' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Saïda';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Skikda') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Skikda' AND c.[Nom] = N'2101'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2101' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Skikda';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Skikda') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Skikda' AND c.[Nom] = N'2104'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2104' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Skikda';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Skikda') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Skikda' AND c.[Nom] = N'2110'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2110' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Skikda';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Skikda') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Skikda' AND c.[Nom] = N'2116'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2116' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Skikda';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sidi Bel Abbès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sidi Bel Abbès' AND c.[Nom] = N'2245'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2245' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sidi Bel Abbès';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sidi Bel Abbès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sidi Bel Abbès' AND c.[Nom] = N'2201'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2201' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sidi Bel Abbès';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Sidi Bel Abbès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Sidi Bel Abbès' AND c.[Nom] = N'2227'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2227' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Sidi Bel Abbès';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Annaba') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Annaba' AND c.[Nom] = N'2305'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2305' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Annaba';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Annaba') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Annaba' AND c.[Nom] = N'2303'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2303' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Annaba';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Annaba') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Annaba' AND c.[Nom] = N'2301'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2301' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Annaba';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Guelma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Guelma' AND c.[Nom] = N'2425'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2425' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Guelma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Guelma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Guelma' AND c.[Nom] = N'2401'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2401' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Guelma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Guelma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Guelma' AND c.[Nom] = N'2404'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2404' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Guelma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Constantine') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Constantine' AND c.[Nom] = N'2504'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2504' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Constantine';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Constantine') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Constantine' AND c.[Nom] = N'2501'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2501' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Constantine';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Constantine') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Constantine' AND c.[Nom] = N'2506'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2506' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Constantine';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Constantine') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Constantine' AND c.[Nom] = N'2502'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2502' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Constantine';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Médéa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Médéa' AND c.[Nom] = N'2635'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2635' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Médéa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Médéa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Médéa' AND c.[Nom] = N'2646'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2646' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Médéa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Médéa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Médéa' AND c.[Nom] = N'2601'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2601' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Médéa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mostaganem') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mostaganem' AND c.[Nom] = N'2701'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2701' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mostaganem';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'M''Sila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'M''Sila' AND c.[Nom] = N'2816'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2816' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'M''Sila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'M''Sila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'M''Sila' AND c.[Nom] = N'2820'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2820' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'M''Sila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'M''Sila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'M''Sila' AND c.[Nom] = N'2801'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2801' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'M''Sila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mascara') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mascara' AND c.[Nom] = N'2906'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2906' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mascara';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mascara') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mascara' AND c.[Nom] = N'2901'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'2901' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mascara';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Laghouat') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Laghouat' AND c.[Nom] = N'301'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'301' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Laghouat';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ouargla') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ouargla' AND c.[Nom] = N'3001'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3001' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ouargla';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ouargla') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ouargla' AND c.[Nom] = N'3013'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3013' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ouargla';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ouargla') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ouargla' AND c.[Nom] = N'3004'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3004' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ouargla';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aflou') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aflou' AND c.[Nom] = N'319'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'319' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aflou';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oran') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oran' AND c.[Nom] = N'3109'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3109' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oran';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oran') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oran' AND c.[Nom] = N'3105'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3105' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oran';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oran') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oran' AND c.[Nom] = N'3101'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3101' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oran';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Oran') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Oran' AND c.[Nom] = N'3106'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3106' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Oran';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Bayadh') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Bayadh' AND c.[Nom] = N'3207'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3207' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Bayadh';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Bayadh') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Bayadh' AND c.[Nom] = N'3201'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3201' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Bayadh';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Illizi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Illizi' AND c.[Nom] = N'3301'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3301' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Illizi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Illizi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Illizi' AND c.[Nom] = N'3302'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3302' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Illizi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Illizi') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Illizi' AND c.[Nom] = N'3306'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3306' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Illizi';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bordj Bou Arreridj') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Bordj Bou Arreridj' AND c.[Nom] = N'3402'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3402' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Bordj Bou Arreridj';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Bordj Bou Arreridj') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Bordj Bou Arreridj' AND c.[Nom] = N'3401'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3401' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Bordj Bou Arreridj';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Boumerdès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Boumerdès' AND c.[Nom] = N'3501'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3501' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Boumerdès';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Boumerdès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Boumerdès' AND c.[Nom] = N'3505'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3505' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Boumerdès';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Tarf') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Tarf' AND c.[Nom] = N'3605'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3605' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Tarf';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Tarf') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Tarf' AND c.[Nom] = N'3601'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3601' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Tarf';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tindouf') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tindouf' AND c.[Nom] = N'3701'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3701' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tindouf';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tissemsilt') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tissemsilt' AND c.[Nom] = N'3802'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3802' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tissemsilt';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tissemsilt') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tissemsilt' AND c.[Nom] = N'3801'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3801' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tissemsilt';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tissemsilt') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tissemsilt' AND c.[Nom] = N'3808'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3808' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tissemsilt';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Oued') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Oued' AND c.[Nom] = N'3901'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3901' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Oued';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Oued') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Oued' AND c.[Nom] = N'3906'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3906' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Oued';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Oued') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Oued' AND c.[Nom] = N'3902'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3902' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Oued';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'El Oued') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'El Oued' AND c.[Nom] = N'3927'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'3927' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'El Oued';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Khenchela') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Khenchela' AND c.[Nom] = N'4003'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4003' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Khenchela';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Khenchela') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Khenchela' AND c.[Nom] = N'4001'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4001' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Khenchela';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Souk Ahras') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Souk Ahras' AND c.[Nom] = N'4101'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4101' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Souk Ahras';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Souk Ahras') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Souk Ahras' AND c.[Nom] = N'4102'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4102' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Souk Ahras';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tipaza') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tipaza' AND c.[Nom] = N'4212'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4212' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tipaza';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tipaza') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tipaza' AND c.[Nom] = N'4222'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4222' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tipaza';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tipaza') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tipaza' AND c.[Nom] = N'4201'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4201' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tipaza';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Tipaza') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Tipaza' AND c.[Nom] = N'4235'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4235' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Tipaza';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mila' AND c.[Nom] = N'4308'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4308' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mila' AND c.[Nom] = N'4302'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4302' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mila' AND c.[Nom] = N'4301'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4301' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Mila') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Mila' AND c.[Nom] = N'4303'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4303' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Mila';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Defla') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aïn Defla' AND c.[Nom] = N'4401'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4401' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aïn Defla';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Defla') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aïn Defla' AND c.[Nom] = N'4404'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4404' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aïn Defla';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Naâma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Naâma' AND c.[Nom] = N'4501'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4501' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Naâma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Naâma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Naâma' AND c.[Nom] = N'4503'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4503' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Naâma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Naâma') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Naâma' AND c.[Nom] = N'4502'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4502' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Naâma';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Témouchent') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aïn Témouchent' AND c.[Nom] = N'4604'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4604' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aïn Témouchent';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Témouchent') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aïn Témouchent' AND c.[Nom] = N'4623'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4623' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aïn Témouchent';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Aïn Témouchent') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Aïn Témouchent' AND c.[Nom] = N'4601'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4601' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Aïn Témouchent';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ghardaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ghardaïa' AND c.[Nom] = N'4701'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4701' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ghardaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ghardaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ghardaïa' AND c.[Nom] = N'4702'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4702' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ghardaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ghardaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ghardaïa' AND c.[Nom] = N'4705'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4705' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ghardaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Ghardaïa') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Ghardaïa' AND c.[Nom] = N'4706'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4706' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Ghardaïa';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Relizane') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Relizane' AND c.[Nom] = N'4822'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4822' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Relizane';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Relizane') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Relizane' AND c.[Nom] = N'4801'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4801' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Relizane';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Relizane') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Relizane' AND c.[Nom] = N'4802'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4802' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Relizane';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Relizane') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Relizane' AND c.[Nom] = N'4811'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'4811' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Relizane';
    IF EXISTS (SELECT 1 FROM [dbo].[Wilaya] WHERE [Nom] = N'Béni Abbès') AND NOT EXISTS (
        SELECT 1 FROM [dbo].[Commune] c INNER JOIN [dbo].[Wilaya] w ON w.[Id] = c.[WilayaId] WHERE w.[Nom] = N'Béni Abbès' AND c.[Nom] = N'807'
    )
        INSERT INTO [dbo].[Commune] ([WilayaId], [Nom])
        SELECT w.[Id], N'807' FROM [dbo].[Wilaya] w WHERE w.[Nom] = N'Béni Abbès';
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data seed migration - no automatic rollback.
        }
    }
}
