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
4. `backend/src/db/ajout-propositions.sql` — obligatoire pour « Proposer mes services » : ajoute `reponse.disponibilites` (VARCHAR(500), nullable pour préserver les anciennes réponses) et un index sur `(idutilisateur, idgig)`. Ce script peut être rejoué sans supprimer de données.

### Proposer mes services — informations à transmettre à l'équipe

Après récupération du code, exécuter `backend/src/db/ajout-propositions.sql` dans pgAdmin sur chaque base existante, puis redémarrer le backend et le frontend. Aucune nouvelle variable d'environnement ni dépendance n'est nécessaire. La migration a été appliquée à la base locale pendant la validation de cette fonctionnalité ; les autres bases doivent être mises à jour séparément.

Le bouton « Proposer mes services » ouvre un formulaire avec le résumé du besoin, un message, un tarif en roupies et les disponibilités. Tous les champs sont obligatoires. Après envoi, une confirmation apparaît, le bouton indique « Proposition envoyée » et la proposition est disponible dans « Mes propositions », y compris après rechargement.

- `POST /api/gigs/:id/proposals` (JWT requis), corps JSON : `{ "message": "Mon expérience…", "price": 1200.50, "availability": "Samedi matin" }`. Retourne `201` avec la proposition enregistrée, au statut `EN_ATTENTE`.
- `GET /api/proposals` (JWT requis) : liste uniquement les propositions de l'utilisateur connecté.
- `GET /api/gigs` inclut désormais `hasProposed` pour chaque besoin.
- L'API refuse un besoin appartenant à l'utilisateur (`403`), un besoin non validé (`409`), un doublon (`409`) et les champs invalides (`400`). Le tarif doit être compris entre Rs 0,01 et Rs 99 999,99, avec deux décimales maximum. Message : 5 000 caractères maximum ; disponibilités : 500.
- L'enregistrement utilise la table `reponse` existante : `contenu`, `prixpropose`, `disponibilites`, `datereponse`, `statusreponse`, `idutilisateur` et `idgig`. Les anciens enregistrements restent inchangés.
- Une transaction et un verrou du besoin empêchent deux propositions simultanées du même utilisateur via cette API.

Validation : `npm.cmd run typecheck` dans `backend`, `npm.cmd run build` dans `frontend`, puis `node --import tsx --test tests/proposals.integration.test.ts` dans `backend`. Les tests utilisent uniquement une base PostgreSQL locale configurée dans `.env`, appliquent la migration et suppriment leurs utilisateurs/annonces/propositions de test en fin d'exécution.

Un conflit Git préexistant a également été résolu dans `backend/src/types/express.d.ts`, avec un ajustement de typage dans `auth.middleware.ts` pour compiler les rôles existants. Les règles d'attribution des rôles et d'accès restent identiques.

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
