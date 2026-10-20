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



La table `utilisateur` doit contenir la colonne `password` (hash bcrypt du mot de passe).

Pour migrer une base plus ancienne qui possède `motdepasse`, exécutez une fois `src/db/mise-a-jour-schema.sql`.



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

