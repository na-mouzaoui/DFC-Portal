# DFC Portal - Documentation fonctionnelle

Ce document décrit le contenu de l'application en 3 parties :
1. Impression de chèque
2. Fisca
3. Page Admin

## 1. Impression de chèque

### Objectif
Permettre la création, la prévisualisation, l'impression et le suivi des chèques.

### Fonctionnalités principales
- Création d'un chèque avec montant, bénéficiaire, ville, date, banque et référence.
- Conversion automatique du montant en lettres (pour l'impression).
- Prévisualisation avant impression.
- Génération et impression PDF du chèque(texts des champs sans fond du cheque).
- Gestion des banques (ajout, modification, suppression) avec modèle PDF de chèque.
- Calibrage des positions des champs par banque et par utilisateur.
- Gestion des chéquiers (création, consultation, mise à jour, suppression selon droits).
- Historique des chèques avec recherche, tri, filtres, export PDF/Excel.
- Mise à jour du statut des chèques (émis, annulé, rejeté) avec motif si nécessaire.
- Journalisation des actions (audit) et notifications temps réel des mises à jour.

### Règles métier importantes
- Le rôle direction n'a pas le droit de créer/imprimer des chèques.
- Les utilisateurs régionale sont limités à leur périmètre régional (accès et données filtrées).
- Référence de chèque vérifiée côté API.
- Si un chéquier est plein, aucun nouveau chèque ne peut être émis dessus.
- Le compteur d'utilisation du chéquier est incrémenté à chaque émission.
- Un chéquier déjà utilisé ne peut plus être modifié.
- Validation des chéquiers :
  - série exactement 2 caractères,
  - numéros dans la plage autorisée,
  - numéro de fin >= numéro de début,
  - unicité sur banque + série + numéro de départ.

## 2. Fisca

### Objectif
Saisir, sauvegarder, modifier, consulter, imprimer et historiser les déclarations fiscales.

### Fonctionnalités principales
- Saisie des déclarations par onglet/tableau fiscal.
- Gestion de la période (mois/année) et de la direction.
- Filtrage automatique des tableaux fiscaux selon le profil et la direction sélectionnée.
- Sauvegarde d'une déclaration (création et modification).
- Consultation des déclarations récentes dans le dashboard fiscal.
- Consultation détaillée au clic ligne, impression PDF, modification, suppression.
- Filtres avancés (type, période, direction, date) et tri dans le dashboard.
- Tableau 1 (Encaissement) en saisie HT avec calcul automatique de la TVA et du TTC.
- Formatage des montants en temps réel (séparateurs de milliers) lors de la saisie.
- Affichage des montants de total en sens droite-vers-gauche pour homogénéité visuelle.
- Rappel automatique de saisie au dashboard fiscal (J-3 jusqu'au délai), avec contrôle global d'avancement par périmètre de compte.
- Gestion des fournisseurs fiscaux :
  - CRUD,
  - export CSV,
  - import CSV intelligent avec déduplication,
  - résolution des conflits (garder l'existant ou remplacer par CSV).
- Gestion des wilayas/communes (tableau TAP) via une source TypeScript dédiée.

### Règles métier importantes
- Le rôle direction n'a pas accès à la création de déclarations fiscales.
- Direction imposée selon le rôle :
  - regionale -> direction fixée automatiquement sur la région du compte,
  - finance/comptabilite -> direction fixée à "Siège",
  - admin -> direction sélectionnable.
- Attribution des tableaux fiscaux par type de compte :
  - regionale -> tableaux 1 à 6,
  - finance/comptabilite -> tableaux 7 à 16.
- Attribution des tableaux fiscaux pour admin selon la direction choisie :
  - direction "Siège" -> tableaux 7 à 16,
  - autre direction -> tableaux 1 à 6,
  - si aucune direction n'est encore sélectionnée -> tableaux 1 à 16.
- Les contrôles d'accès par tableau sont appliqués côté frontend et côté backend.
- Compatibilité historique Tableau 1 : les anciennes déclarations sauvegardées avec Encaissement TTC sont automatiquement converties en HT au chargement.
- Validation des champs obligatoires avant sauvegarde selon le tableau actif.
- Le mois/année sélectionnés sont limités aux périodes encore ouvertes pour le profil connecté.
- Unicité des factures pour les tableaux TVA (2 et 3) sur la clé :
  - fournisseur,
  - référence facture,
  - date facture.
- Cette unicité est contrôlée côté frontend et côté backend, y compris sur l'historique des périodes.
- Règle de clôture de période (délai légal interne) :
  - Comptes régionaux : date limite = 10 du mois suivant à 23:59:59.
  - Comptes admin et finance : date limite = 15 du mois suivant à 23:59:59.
  - Exemple : période Mars 2026 -> limite au 10 Avril 2026 (régional) et au 15 Avril 2026 (admin/finance), à 23:59:59.
  - Au-delà du délai applicable au compte connecté : création, modification et suppression interdites.
  - Le blocage est appliqué côté frontend et côté backend.
- Rappel de complétude des tableaux (dashboard fiscal) :
  - Fenêtre d'affichage : de J-3 jusqu'à l'échéance incluse.
  - Comptes regionale : le rappel reste affiché pour tous les comptes de la même région tant que les tableaux 1 à 6 ne sont pas tous saisis (au moins une saisie par tableau sur la période cible).
  - Comptes finance/comptabilite : le rappel reste affiché pour tous les comptes finance tant que les tableaux 7 à 16 ne sont pas tous saisis (au moins une saisie par tableau sur la période cible).
  - Le rappel s'éteint automatiquement quand tous les tableaux du périmètre sont couverts ou en dehors de la fenêtre J-3 -> délai.
- Les données peuvent exister localement (cache local) et sont aussi persistées côté API.

## 3. Page Admin

### Objectif
Centraliser l'administration des utilisateurs, des référentiels et de l'audit.

### Fonctionnalités principales
- Tableau de bord admin en 3 onglets :
  - Utilisateurs,
  - Audit,
  - Gestion.
- Gestion des utilisateurs :
  - création,
  - modification,
  - suppression,
  - attribution du rôle,
  - attribution de région,
  - attribution des modules d'accès.
- Journal d'audit :
  - consultation des actions système,
  - filtres (utilisateur, action, dates),
  - tri et visualisation détaillée.
- Espace Gestion (ordre actuel) :
  1. Gestion des banques
  2. Gestion des fournisseurs fiscaux
  3. Configuration des régions
- Configuration des régions :
  - création,
  - modification,
  - suppression,
  - affectation des villes.

### Règles métier importantes
- Accès réservé aux administrateurs.
- Redirection automatique des non-admin vers les pages autorisées.
- Validation numéro de téléphone utilisateur : doit commencer par 0 et contenir exactement 10 chiffres.
- Si le rôle est regionale, la région est obligatoire.
- Les actions sensibles sont tracées dans le journal d'audit.

---

