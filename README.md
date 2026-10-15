# Micro Besoins 

## Configuration du backend

Chaque développeur doit disposer de PostgreSQL et de sa propre base créée
avec le script `MicroBesoins.sql` de la branche
`MB-26-creer-la-bdd-des-utilisateurs`.

Depuis le dossier `backend`, copier le modèle (PowerShell) :

```powershell
Copy-Item .env.example .env
```

Dans `.env`, adapter `DATABASE_URL` : utilisateur PostgreSQL, mot de passe,
port et nom exact de la base (par exemple `microBesoins`). Les caractères
spéciaux des identifiants doivent être encodés pour une URL.
Ce mot de passe est celui de PostgreSQL, pas celui d'un compte du site.

Générer ensuite un secret personnel et le renseigner dans `JWT_SECRET` :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Conserver `CORS_ORIGIN=http://localhost:4200` pour le front Angular local.
Installer les dépendances avec `npm install`, puis lancer `npm run dev`.

Le fichier `.env.example` est partagé sur Git. Le vrai `.env` contient les
secrets de chaque développeur et reste ignoré par Git.
