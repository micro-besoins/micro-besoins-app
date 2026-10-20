# Micro-Besoins

Application web Micro-Besoins composée d'un front-end Angular et d'une API Express avec PostgreSQL.

## Prérequis

- Node.js LTS et npm
- PostgreSQL
- Une base locale nommée `micro_besoins`

## Installation

Clonez le dépôt, puis installez les dépendances des deux projets :

```bash
git clone <url-du-depot>
cd micro-besoins-app

cd backend
npm install

cd ../frontend
npm install
```

## Configuration du back-end

Dans le dossier `backend`, copiez le fichier d'exemple :

```powershell
Copy-Item .env.example .env
```

Renseignez ensuite les variables dans `backend/.env` :

| Variable | Description |
| --- | --- |
| `PORT` | Port de l'API (`3000` par défaut) |
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `JWT_SECRET` | Clé secrète pour signer les jetons JWT |
| `JWT_EXPIRES_IN` | Durée de validité du jeton (ex. `1h`) |
| `CORS_ORIGIN` | URL du front autorisée (`http://localhost:4200`) |

Ne commitez jamais le fichier `.env` ou une clé secrète.

La table `utilisateur` utilise la colonne `password`, qui contient le hash bcrypt (jamais le mot de passe en clair). Pour une base existante utilisant encore `motdepasse`, exécutez une fois le script `backend/src/db/mise-a-jour-schema.sql`.

## Lancer le projet en développement

Ouvrez deux terminaux.

### API Express

```bash
cd backend
npm run dev
```

L'API est disponible sur `http://localhost:3000`.

### Application Angular

```bash
cd frontend
npm start
```

Ouvrez ensuite `http://localhost:4200` dans le navigateur.

## Compiler

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

## Tests API

L'API et PostgreSQL doivent être démarrés et configurés avant de lancer les tests :

```bash
cd backend
npm test
```

## Routes d'authentification

| Méthode | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Crée un compte |
| `POST` | `/api/auth/login` | Connecte un utilisateur |
| `GET` | `/api/auth/me` | Renvoie l'utilisateur connecté (jeton requis) |

L'inscription attend les champs `nom`, `prenom`, `email`, `password` et `role` (`demandeur` ou `prospect`).

## Dépannage

- Si le front ne peut pas joindre l'API, vérifiez que l'API écoute sur le port `3000` et que `CORS_ORIGIN=http://localhost:4200` est défini dans `backend/.env`.
- Si `npm` signale qu'il ne trouve pas `package.json`, placez-vous dans `backend` ou `frontend` avant de lancer une commande npm.
