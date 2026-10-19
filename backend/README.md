# Backend

API REST de **Micro-Besoins** : Node.js, Express, TypeScript et PostgreSQL.

## Prérequis

- [Node.js](https://nodejs.org) 20 ou plus récent
- [PostgreSQL](https://www.postgresql.org/download/) avec la base créée (voir [`../database/README.md`](../database/README.md))

## Installation

```bash
cd backend
npm install
cp .env.example .env      # puis modifiez .env avec vos valeurs (mot de passe PostgreSQL, JWT_SECRET)
npm run dev
```

L'API démarre sur <http://localhost:3000>. Vérification :

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"up"}
```

Si vous obtenez `"database":"down"`, vérifiez les valeurs `DB_*` du `.env` et que la base `microbesoins` existe avec ses tables.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarre avec redémarrage automatique à chaque modification |
| `npm run build` | Compile le TypeScript vers `dist/` |
| `npm start` | Démarre la version compilée (après `npm run build`) |
| `npm run typecheck` | Vérifie les types sans compiler |
| `npm run token:admin -- <id>` | Génère un token JWT de test pour l'utilisateur `<id>` |

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port de l'API |
| `CORS_ORIGIN` | `http://localhost:4200` | URL du frontend autorisée à appeler l'API |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Adresse de PostgreSQL |
| `DB_NAME` | `microbesoins` | Nom de la base |
| `DB_USER` / `DB_PASSWORD` | `postgres` / | Identifiants PostgreSQL |
| `JWT_SECRET` | **obligatoire** | Secret de vérification des tokens JWT |

> Le fichier `.env` contient des secrets : il est ignoré par git. Seul `.env.example` est commité.

## Structure du projet

```
backend/src/
├── app.ts / server.ts
├── config/        env.ts                 # lecture des variables d'environnement
├── db/            pool.ts, query.ts      # connexion PostgreSQL + exécution des requêtes
├── middleware/    auth.ts, error-handler.ts, not-found.ts
├── routes/        index.ts, admin.routes.ts, health.routes.ts
├── controllers/   stats, publications, paiements, signalements
├── services/      stats, publications, paiements, signalements   # logique + SQL
├── types/         admin.types.ts, express.d.ts
└── utils/         app-error.ts, constants.ts, pagination.ts
```

Chemin d'une requête : **route → controller → service → base de données**.
Les controllers lisent et valident la requête, les services contiennent le SQL.

## Endpoints administrateur

Toutes les routes `/api/admin/*` exigent un token d'un utilisateur dont `roleUtilisateur = 'ADMIN'` :

```
Authorization: Bearer <token>
```

### Statistiques du tableau de bord

| Méthode | Route | Réponse |
|---|---|---|
| GET | `/api/admin/stats` | `{ "publicationsAValider": 3, "paiementsEchoues": 2, "signalementsOuverts": 2 }` |
| GET | `/api/admin/stats/publications-a-valider` | `{ "count": 3 }` |
| GET | `/api/admin/stats/paiements-echoues` | `{ "count": 2 }` |
| GET | `/api/admin/stats/signalements-ouverts` | `{ "count": 2 }` |

### Listes détaillées

| Méthode | Route | Filtre `status` par défaut |
|---|---|---|
| GET | `/api/admin/publications` | `EN_ATTENTE` (autres : `VALIDE`, `REFUSE`) |
| GET | `/api/admin/paiements` | `ECHOUE` (autres : `EN_ATTENTE`, `REUSSI`) |
| GET | `/api/admin/signalements` | `OUVERT` (autre : `TRAITE`) |

Paramètres optionnels : `?status=...&page=1&limit=20` (limite maximale : 100).

Forme de la réponse :

```json
{
  "data": [ { "idGig": 3, "titre": "...", "budget": 800, "status": "EN_ATTENTE", "auteurNom": "...", "...": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

### Actions

| Méthode | Route | Effet |
|---|---|---|
| PATCH | `/api/admin/publications/:id/accepter` | `EN_ATTENTE` → `VALIDE` |
| PATCH | `/api/admin/publications/:id/refuser` | `EN_ATTENTE` → `REFUSE` |
| PATCH | `/api/admin/signalements/:id/traiter` | `OUVERT` → `TRAITE` (enregistre l'admin et la date) |

Aucune de ces actions n'a de corps de requête. Elles ne fonctionnent que sur un élément encore en attente : sinon l'API répond `409`.

## Erreurs

Toutes les erreurs ont la même forme : `{ "code": "...", "message": "..." }`.

| HTTP | `code` | Cas |
|---|---|---|
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
