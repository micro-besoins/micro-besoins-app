# \# Micro-Besoins — API (back-end)



API REST de la plateforme Micro-Besoins, construite avec Node.js, Express (TypeScript) et PostgreSQL.

Elle gère pour l'instant l'\*\*authentification\*\* : inscription, connexion et vérification du token JWT.



\## Prérequis



\- Node.js (version LTS récente) et npm

\- PostgreSQL, avec la base `microBesoins` créée et le script de création des tables exécuté



\## Installation



```bash

npm install

```



\## Configuration



Copier `.env.example` en `.env`, puis renseigner les valeurs :



| Variable | Rôle |

|---|---|

| `PORT` | Port de l'API (3000 par défaut) |

| `DATABASE\_URL` | Connexion PostgreSQL, ex. `postgresql://utilisateur:motdepasse@localhost:5432/microbesoins` (le nom de la base doit correspondre exactement) |

| `JWT\_SECRET` | Chaîne secrète qui sert à signer les tokens. À générer soi-même, \*\*jamais partagée ni envoyée sur Git\*\* |

| `JWT\_EXPIRES\_IN` | Durée de validité d'un token (`1h` par défaut) |

| `CORS\_ORIGIN` | Adresse du front autorisée (`http://localhost:4200` pour Angular) |



Générer un `JWT\_SECRET` :



```bash

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

```



Le fichier `.env` est dans le `.gitignore` : chacun a le sien en local.



\## Base de données



La table `utilisateur` doit contenir la colonne `motdepasse` (hash bcrypt du mot de passe). Le champ reçu par l'API reste nommé `password`.

Pour migrer une base plus ancienne qui possède `password`, exécutez une fois `src/db/mise-a-jour-schema.sql`. Ce script renomme la colonne sans perdre les hashes, crée aussi la table de référence `categorie` et initialise les catégories proposées lors de la publication ; elles ne dépendent pas des annonces existantes.

Les annonces de démonstration sont facultatives : exécutez `src/db/jeu-de-donnees-demo.sql` seulement pour tester la recherche et les filtres avec des annonces initiales.

### Scripts SQL

Après la création des tables initiales, exécutez les scripts dans cet ordre :

1. `src/db/mise-a-jour-schema.sql` : met à jour le schéma et initialise les catégories.
2. `src/db/ajout-architecture-paiement.sql` : crée le stockage des intentions de paiement, sans activer de paiement réel.
3. `src/db/jeu-de-donnees-demo.sql` : facultatif, ajoute des annonces pour tester les filtres.

`src/db/ajout-mot-de-passe.sql` est un ancien script conservé pour compatibilité ; utilisez plutôt `mise-a-jour-schema.sql`.



\## Lancer l'API



```bash

npm run dev      # développement, rechargement automatique

npm run build    # compilation TypeScript vers dist/

npm start        # lancement de la version compilée

```



L'API écoute sur `http://localhost:3000`. Ouvrir cette adresse dans un navigateur affiche « Cannot GET / » : c'est normal, il n'y a pas de page d'accueil.



\## Endpoints



| Méthode | Route | Description |

|---|---|---|

| POST | `/api/auth/register` | Crée un compte |

| POST | `/api/auth/login` | Connecte l'utilisateur et renvoie un token |

| GET | `/api/auth/me` | Renvoie l'id et le rôle de l'utilisateur connecté (token requis) |



\*\*Inscription\*\* — corps JSON :



```json

{ "nom": "NomExample", "prenom": "PrenomExample", "email": "nom@test.com", "password": "motdepasse1", "role": "demandeur" }

```



\- `role` : `demandeur` ou `prospect` (le rôle `administrateur` ne peut pas être choisi à l'inscription)

\- `nom` et `prenom` : 20 caractères maximum, `email` : 100, `password` : entre 8 et 72

\- Réponse : `201` avec `{ user }`



\*\*Connexion\*\* — corps JSON : `{ "email": "...", "password": "..." }`

Réponse : `200` avec `{ token, user }`.



\*\*Routes protégées\*\* : envoyer l'en-tête `Authorization: Bearer <token>`.



\*\*Codes d'erreur\*\* : `400` champs manquants ou invalides, `401` identifiants incorrects ou token invalide (même message que l'email soit inconnu ou le mot de passe faux), `409` email déjà utilisé, `403` accès refusé pour le rôle.



\## Tester (PowerShell)



```powershell

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register -ContentType "application/json" -Body '{ "nom": "NomExample", "prenom": "PrenomExample", "email": "nom@test.com", "password": "motdepasse1", "role": "demandeur" }'



$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"nom@test.com","password":"motdepasse1"}'

Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $($r.token)" }

```



\## Structure du projet



```

src/

&#x20; server.ts, app.ts          démarrage et configuration d'Express

&#x20; config/                    variables d'environnement, connexion PostgreSQL

&#x20; routes/                    définition des routes

&#x20; controllers/               validation des entrées et réponses HTTP

&#x20; services/                  logique métier et requêtes SQL

&#x20; middleware/                authenticate (JWT), requireRole, gestion des erreurs

&#x20; types/, utils/             types partagés, classe d'erreur

&#x20; db/                        scripts SQL

```



Pour protéger une future route : `router.get('/...', authenticate, requireRole('administrateur'), handler)`.

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

## Modification du schéma de la table paiement :
Afin de gérer les paiements à la publication, la table paiement a été modifiée :
- Ajout de la colonne idgig (clé étrangère vers gig).
- La colonne idreponse devient optionnelle (NULL).
Executer la dernière partie du code dans mise-a-jour-schema.sql, ligne 54 à 58

