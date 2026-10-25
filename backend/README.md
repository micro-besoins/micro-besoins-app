# Micro-Besoins — API back-end

API REST construite avec Node.js, Express, TypeScript et PostgreSQL.

## Prérequis

- Node.js 20 ou plus récent
- PostgreSQL avec une base `microBesoins`

## Installation et lancement

Depuis le dossier `backend` :

```powershell
npm install
npm run dev
```

L'API démarre sur `http://localhost:3000`.

## Configuration

Créez un fichier `backend/.env` qui contient au minimum :

```env
PORT=3000
DATABASE_URL=postgresql://utilisateur:motdepasse@localhost:5432/microBesoins
JWT_SECRET=choisissez-un-secret-long-et-prive
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:4200
```

`DATABASE_URL` est la variable réellement utilisée par l'application. Ne partagez jamais `.env` ni `JWT_SECRET` sur GitHub.

## Base de données

Exécutez les scripts SQL dans cet ordre sur une nouvelle base :

1. `../MicroBesoins.sql` — crée les tables principales.
2. `src/db/mise-a-jour-schema.sql` — aligne une base existante, initialise les catégories et les données liées aux paiements.
3. `src/db/ajout-rdv-table-reponse.sql` — ajoute `reponse.date_rendez_vous`, nécessaire lorsqu'une proposition est acceptée.
4. `src/db/ajout-notification.sql` — crée la table `notification` utilisée par les routes de notifications.
5. `src/db/ajout-messagerie.sql` — crée les tables `conversation` et `message` pour la messagerie.
6. `src/db/ajout-signalement-message.sql` — crée la table `signalement_message` pour les contenus signalés.
7. `src/db/ajout-frais-publication-existants.sql` — ajoute les frais de Rs 75 manquants et confirme ceux restés en attente pour les annonces déjà validées.
8. `src/db/jeu-de-donnees-demo.sql` — facultatif, ajoute des données de démonstration.

Les scripts 3 et 4 peuvent être exécutés sans risque plusieurs fois : ils ne suppriment aucune donnée.

## Scripts npm

| Commande | Description |
|---|---|
| `npm run dev` | Lance l'API avec rechargement automatique |
| `npm run typecheck` | Vérifie les types TypeScript |
| `npm run build` | Compile le projet vers `dist/` |
| `npm start` | Lance la version compilée |

## Routes principales

Toutes les routes protégées exigent `Authorization: Bearer <token>`.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/gigs` | Liste les besoins validés |
| `GET` | `/api/gigs/:id` | Détail d'un besoin ; son auteur reçoit aussi les propositions |
| `POST` | `/api/gigs/:id/propositions` | Envoie une proposition : `{ "message": "…", "montant": 700 }` |
| `PATCH` | `/api/gigs/reponses/:id/accepter` | Accepte une proposition : `{ "dateRdv": "2026-10-25T10:00" }` ; la date est facultative |
| `PATCH` | `/api/gigs/reponses/:id/terminer` | Le propriétaire confirme la fin du service et enregistre le paiement du prestataire |
| `GET` | `/api/notifications` | Liste les notifications de l'utilisateur connecté |
| `GET` | `/api/notifications/unread-count` | Compte les notifications non lues |
| `PATCH` | `/api/notifications/:id/read` | Marque une notification comme lue |
| `PATCH` | `/api/notifications/read-all` | Marque toutes les notifications comme lues |
| `GET` | `/api/conversations` | Liste les conversations de l'utilisateur connecté |
| `POST` | `/api/conversations` | Crée ou récupère une conversation pour un besoin : `{ "gigId": 12 }` |
| `GET` | `/api/conversations/:id/messages` | Récupère les messages d'une conversation et marque les messages reçus comme lus |
| `POST` | `/api/conversations/:id/messages` | Envoie un message : `{ "content": "Bonjour" }` |
| `POST` | `/api/conversations/:id/signalements` | Signale le dernier contenu reçu de la conversation : `{ "reason": "…" }` |

Les routes d'administration sont sous `/api/admin/*` et exigent un utilisateur dont le rôle est `ADMIN`.

## Règles de messagerie

- Une conversation est liée à un seul besoin et à deux utilisateurs distincts.
- Une conversation existante est réutilisée : les doublons sont empêchés par la base et par l'API.
- Seuls les deux participants peuvent consulter ou envoyer des messages.
- L'envoi d'une proposition crée automatiquement la conversation avec l'auteur du besoin.
- Le premier clic sur **Contacter l'auteur** crée la conversation et envoie un message d'introduction ; les clics suivants réutilisent la conversation sans envoyer de doublon.
- Chaque message envoyé crée une notification pour son destinataire.
| 400 | `INVALID_PARAMETER` / `INVALID_JSON` | Paramètre, id ou statut invalide, JSON mal formé |
| 401 | `UNAUTHENTICATED` / `INVALID_TOKEN` | Token absent, invalide, expiré ou utilisateur inconnu |
| 403 | `FORBIDDEN` | Utilisateur connecté mais non administrateur |
| 404 | `NOT_FOUND` / `ROUTE_NOT_FOUND` | Publication, signalement ou route introuvable |
| 409 | `ALREADY_PROCESSED` | Élément déjà accepté, refusé ou traité |
| 500 | `DATABASE_ERROR` / `INTERNAL_ERROR` | Erreur serveur (détails dans les logs, jamais envoyés au client) |
| 503 | `DATABASE_UNAVAILABLE` | Base de données injoignable |

## Tester en local

1. Chargez les données de test : `psql -U postgres -d microbesoins -f ../database/seed.sql` (l'utilisateur n° 1 est administrateur).
2. Générez un token : `npm run token:admin -- 1`
3. Appelez l'API :

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/admin/stats
curl -X PATCH -H "Authorization: Bearer <token>" http://localhost:3000/api/admin/publications/1/accepter
```

## Points à valider avec l'équipe

- **Authentification :** ce ticket **vérifie** les tokens JWT (signature, expiration, rôle `ADMIN` relu en base). Le service de **connexion** qui émet ces tokens n'est pas inclus : il doit signer le token avec le même `JWT_SECRET` et placer l'id de l'utilisateur dans le champ standard `sub`.
- **Valeurs de statut :** `EN_ATTENTE`, `VALIDE`, `REFUSE`, `ECHOUE`, `OUVERT`, `TRAITE`, `ADMIN`… sont définies dans `src/utils/constants.ts`. Si l'équipe utilise d'autres valeurs, il suffit de les changer à cet endroit.
- **Table `signalement` :** ajoutée à `database/schema.sql` pour ce ticket (elle n'existait pas).
- **Requêtes SQL :** toujours paramétrées (`$1`, `$2`…), jamais de concaténation de texte, pour éviter les injections SQL.

## Modification du schéma de la table paiement :
Afin de gérer les paiements à la publication, la table paiement a été modifiée :
- Ajout de la colonne idgig (clé étrangère vers gig).
- La colonne idreponse devient optionnelle (NULL).
Executer la dernière partie du code dans mise-a-jour-schema.sql, ligne 54 à 58

# Page « Mes propositions »

Les propositions sont lues dans la table `reponse` existante. Aucune migration supplémentaire n’est nécessaire pour cette page.

Toutes les routes suivantes nécessitent un token `Authorization: Bearer …` :

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | `/api/proposals` | Propositions envoyées par le compte connecté, classées par date décroissante |
| GET | `/api/proposals/:id/need` | Besoin associé à une proposition du compte connecté |
| GET | `/api/proposals/:id/profile` | Nom public et nombre de besoins validés publiés par le demandeur |
| PATCH | `/api/proposals/:id/withdraw` | Passage atomique de `EN_ATTENTE` à `RETIREE`, sans suppression de l’historique |

Le retrait renvoie `404` pour une proposition absente ou appartenant à un autre compte, et `409` si elle n’est plus en attente. Les statuts affichés sont `EN_ATTENTE`, `ACCEPTEE`, `REFUSEE` et `RETIREE` (les formes historiques `ACCEPTE`, `REFUSE` et `RETIRE` sont également affichées).

Pour lancer les tests d’intégration, initialiser une base de test avec `MicroBesoins.sql`, puis configurer `DATABASE_URL` vers cette base et exécuter `npm run test:proposals` depuis `backend`. Les tests démarrent leur propre serveur HTTP, créent leurs comptes et propositions, puis nettoient leurs données. Ne pas les exécuter sur une base de production.

