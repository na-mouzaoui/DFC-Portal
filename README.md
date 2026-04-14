# DFC Portal - Documentation fonctionnelle

Ce document décrit le contenu de l'application en 4 parties :
1. Impression de chèque
2. Fisca
4. Page Admin

## 1. Impression de chèque

### Objectif
Permettre la création, la prévisualisation, l'impression et le suivi des chèques et chèquiers .

### Fonctionnalités principales
- Création d'un chèque avec montant, bénéficiaire, ville, date, banque et référence.
- Generation automatique de la reference (selon le premier cheque disponible du chequiers selectioné)
- Conversion automatique du montant en lettres (pour l'impression).
- Prévisualisation avant impression.
- Génération et impression PDF du chèque(texts des champs sans fond du cheque).
- Gestion des banques (admin).
- Gestion des fournisseur (ajout, modification, suppression).
- Gestion des chéquiers (création, consultation, mise à jour, suppression).
- Calibrage des positions des champs par banque et par utilisateur.
- Historique des chèques avec recherche, tri, filtres, export PDF/Excel.
- Mise à jour du statut des chèques (émis, annulé, rejeté) avec motif si nécessaire.
- Indicateur sur le montant totales decheques emits , le nombre des cheques emis , rejetes et annulés 

### Règles métier importantes
- Le rôle direction n'a pas le droit de créer/imprimer des chèques (consultation seul).
- la porte de la gestion des different entites (cheques, chequiers fournisseur) est regionale
- L’unicité des fournisseur se fait sur ID, deux fournisseur peuvent avoir le meme nom tant qu'il ne sont pas cree par la meme region.
- Les utilisateurs régionale sont limités à leur périmètre régional (accès et données filtrées).
- Référence du chèque est vérifiée sur la  disponibilite(si la reference n'as pas deja ete utilise ) + l'existance (selon le chequier utilise ).
- Si un chéquier est utilisé, il ne peut ni etre modifié ni supprimé.


## 2. Fisca

### Objectif
Saisir, sauvegarder, modifier, consulter, imprimer et historiser les déclarations fiscales.

### Fonctionnalités principales
- Saisie des déclarations par tableau fiscal.
- consultation,modification,validation (pour les comptes approbateurs) et impressionn des declaration emisent 
- Filtrage automatique des tableaux fiscaux selon le profil et la direction sélectionnée.
- Gestion de la période (mois/année) et de la direction.
- Rappels fiscaux et indicateurs de complétude/approbation dans le dashboard fiscal(J-5).
- Gestion des fournisseurs fiscaux (admin)
- Generation et remplissage semi-automatique des tableau etats de sortie (recap)


### Règles métier importantes
- Le rôle direction ne peut que consulter les declaration deja emises.
- Attribution des tableaux fiscaux par type de compte :
  - regionale -> tableaux 1 à 6,
  - finance/comptabilite -> tableaux 7 à 16.
- Unicité des factures pour les tableaux TVA (2 et 3) sur la clé :
  - fournisseur,
  - référence facture,
  - montant HT.
- Limite temporelle des factures : les factures saisies ne doivent pas dater de plus de 13 mois avant la période actuelle.
- Règle de clôture de période :
  - Comptes régionaux : date limite = 10 du mois suivant à 23:59:59.
  - Comptes admin et finance : date limite = 15 du mois suivant à 23:59:59.
- Au-delà du délai applicable au compte connecté : création, modification et suppression interdites.
- Permissions de modification/suppression par type de profil :
  - Les utilisateurs d'une région ne peuvent modifier et supprimer que les déclarations de leur région.
  - Les utilisateurs finance ne peuvent modifier et supprimer les déclarations du siège.
  - Les admins peuvent modifier/supprimer toutes les déclarations.
- Les utilisateurs d'une région ne peuvent consulter que les déclarations de leur région tandis que les comptes finance et global peuvent consulter toutes les declaration
- Un approbateur régional peut approuver uniquement les déclarations d'autres utilisateurs de la même région.
- Un approbateur finance peut approuver uniquement les déclarations du niveau Siège.
- Une déclaration modifiée repasse automatiquement en état "En attente" (nouvelle approbation requise).
- l'acces aux tableu des etats de sorties (sasie,et gestion des tableau) est reserver au compte finances,global(consultation seul) et admin
- le remplissage des cases des tableau des etats de sortie (quand c'est possible) se fait sur la base des desclartions fisca (regional et siege)
- dans le cas ou des donnees requi pour la generation des tableu des etats de sortie ,ne sont pas sasiees il sont mis a 0 avec un avertissment .

-les canvas des fichier pdf des declaration sont unifie mise a part pour les tab 2-3 ou le canvas doit suivire celui impose par la direction des impots 

## 4. Page Admin

### Objectif
Centraliser l'administration des utilisateurs, des référentiels et de l'audit.

### Fonctionnalités principales
- Gestion des utilisateurs :
  - création,modification,suppression,attribution du rôle,attribution de région,activation de l'option "compte approbateur",attribution des modules d'accès,reinitialisation des mot de passe
- Journal d'audit :
  - consultation des actions utilisateurs,
- Espace Gestion :
  - Gestion des banques (ajout, modification, suppression) avec modèle PDF de chèque
  - Gestion des fournisseurs fiscaux (creation, modification suprresion,import CSV intelligent (avec verification des doublant),export en excel/ pdf .
  - Configuration des régions:création,modification,suppression,affectation des villes.

