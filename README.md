# MicroBesoins — Base de données

## Description

Ce dossier contient le script SQL de la base de données du projet **MicroBesoins**. La base de données est développée avec **PostgreSQL** et permet de gérer les utilisateurs, les offres de services (*gigs*), les réponses, les paiements et les avis.

## Technologies utilisées

- **SGBD :** PostgreSQL
- **Langage :** SQL

## Structure de la base de données

La base de données comprend cinq tables principales :

|     Table     | Description |
|---------------|-------------|
| `utilisateur` | Stocke les informations des utilisateurs, notamment leur nom, prénom, adresse e-mail, mot de passe et rôle. |
| `gig`         | Contient les offres de services publiées par les utilisateurs, avec leur titre, description, budget et statut. |
| `reponse`     | Enregistre les réponses aux offres, le contenu proposé, le prix et le statut de chaque réponse. |
| `paiement`    | Stocke les informations relatives aux paiements, notamment le montant, la méthode et le statut. |
| `avis`        | Permet d'enregistrer les notes et les commentaires associés aux offres. |

## Relations entre les tables

- Un utilisateur peut publier plusieurs offres (`gig`).
- Un utilisateur peut envoyer plusieurs réponses (`reponse`).
- Une offre peut recevoir plusieurs réponses.
- Un utilisateur peut effectuer plusieurs paiements.
- Un paiement est associé à une réponse.
- Les avis sont liés à un utilisateur et à une offre.

Les relations sont assurées par des clés étrangères (`FOREIGN KEY`). La règle `ON DELETE CASCADE` permet de supprimer automatiquement les enregistrements dépendants lorsqu'un enregistrement référencé est supprimé.

## Installation et création

La table `utilisateur` utilise la colonne `motdepasse`, qui contient le hash bcrypt (jamais le mot de passe en clair). Le champ de l'API reste nommé `password`. Pour une base existante utilisant encore `password`, exécutez une fois le script `backend/src/db/mise-a-jour-schema.sql`.

### Initialiser les catégories

Après la création des tables, exécutez `backend/src/db/mise-a-jour-schema.sql`. Ce script crée la table de référence `categorie` et ajoute les catégories disponibles : Nettoyage, Jardinage, Aide informatique, Petits travaux et Cours particuliers. La liste de publication est donc disponible même si aucune annonce n'existe encore.

Les annonces de démonstration sont facultatives : exécutez ensuite `backend/src/db/jeu-de-donnees-demo.sql` uniquement pour tester la recherche et les filtres avec des annonces initiales.

### Scripts SQL disponibles

Après avoir créé la base et les tables initiales, exécutez les scripts dans cet ordre :

1. `backend/src/db/mise-a-jour-schema.sql` — obligatoire pour une base existante : met à jour le schéma et initialise les catégories.
2. `backend/src/db/ajout-architecture-paiement.sql` — crée le stockage des intentions de paiement ; aucun prestataire de paiement réel n'est activé.
3. `backend/src/db/jeu-de-donnees-demo.sql` — facultatif : ajoute des annonces de départ pour tester l'accueil, la recherche et les filtres.
4. `backend/src/db/ajout-gestion-propositions.sql` — ajoute `reponse.disponibilite` et un index sur `reponse.idgig`, sans supprimer les données existantes. À appliquer pour gérer les propositions reçues.

### Gestion des propositions reçues

#### Modifications de la base de données — 25 octobre 2026

La migration `backend/src/db/ajout-gestion-propositions.sql` a été **appliquée à la base locale** pendant le développement de cette fonctionnalité. Elle apporte uniquement les changements de schéma suivants :

| Élément | Modification | Utilité |
|---|---|---|
| Table `reponse` | Ajout de la colonne `disponibilite` de type `TEXT`, facultative | Enregistrer et afficher la disponibilité indiquée par le prestataire. |
| Table `reponse` | Ajout de l'index `idx_reponse_gig` sur `idgig` | Accélérer la récupération des propositions d'un besoin. |

Aucune table ni donnée existante n'a été supprimée par cette migration. Les anciennes propositions conservent leurs données ; leur disponibilité reste `NULL` si elle n'était pas renseignée. Le script peut être réexécuté sans recréer la colonne ou l'index grâce à `IF NOT EXISTS`. Pour une autre installation, il faut appliquer ce même script à sa base.

Les décisions utilisent les colonnes de statut déjà existantes : `reponse.statusreponse` reçoit `ACCEPTEE` ou `REFUSEE`. En cas d'acceptation, `gig.statusgig` passe à `EN_COURS`, `gig.datemodification` est actualisée et les autres propositions en attente sont refusées. Aucune colonne de statut supplémentaire n'a été ajoutée.

Les comptes, besoins et propositions créés temporairement pour les tests ont été supprimés après vérification.

#### Interface et API

Dans Explorer, le bouton **Voir les propositions** d'un besoin vous appartenant ouvre `/besoins/:id#propositions`. Le détail utilise la même largeur et le même en-tête qu'Explorer. Le propriétaire peut comparer les propositions, consulter le profil public des prestataires et accepter ou refuser une proposition.

L'acceptation enregistre `ACCEPTEE`, passe le besoin à `EN_COURS` et refuse les autres propositions encore `EN_ATTENTE` dans une transaction avec verrouillage. Le besoin en cours reste accessible à son propriétaire depuis Explorer. Un refus seul enregistre `REFUSEE` et laisse le besoin publié. Les disponibilités anciennes non renseignées sont affichées comme telles.

Les endpoints authentifiés sont `GET/POST /api/gigs/:id/proposals`, `PATCH /api/gigs/:id/proposals/:proposalId` (corps : `{ "decision": "accept" }` ou `"refuse"`) et `GET /api/gigs/profiles/:providerId`. La consultation de la liste et les décisions sont réservées au propriétaire côté serveur. Le profil public expose uniquement le nom, le prénom et le nombre de propositions acceptées.

Test d'intégration (base configurée dans `backend/.env`, migration appliquée) : depuis `backend`, `node --import tsx --test tests/proposals.integration.test.ts`. Les comptes et besoins temporaires du test sont supprimés à la fin.

Le script `backend/src/db/ajout-mot-de-passe.sql` est conservé pour les anciennes installations, mais son traitement est déjà inclus dans `mise-a-jour-schema.sql`.

Dans PostgreSQL ou dans pgAdmin, exécuter :

```sql
CREATE DATABASE "microBesoins";
```

### 2. Se connecter à la base de données

Dans pgAdmin, sélectionner la base de données créée, puis ouvrir l'outil **Query Tool**.

### 3. Créer les tables

Exécuter le contenu du fichier `MicroBesoins.sql` dans la base de données `microBesoins`.

Les tables doivent être créées dans le bon ordre afin de respecter les relations entre les clés primaires et les clés étrangères.

## Remarques

- Les identifiants (`idUtilisateur`, `idGig`, etc.) sont générés automatiquement grâce à `GENERATED ALWAYS AS IDENTITY`.
- Les adresses e-mail des utilisateurs doivent être uniques.
- Les champs obligatoires sont définis avec `NOT NULL`.
- Les mots de passe doivent être stockés sous forme de hachage sécurisé dans l'application, et non en texte brut.
- Les statuts et les rôles sont actuellement représentés par des champs `VARCHAR`.

## Projet
