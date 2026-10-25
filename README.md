# Micro-Besoins

Micro-Besoins est une plateforme de services de proximité : une personne publie un besoin, des prestataires envoient leurs propositions, puis le propriétaire du besoin choisit une proposition et suit le service jusqu'à sa finalisation.

## Fonctionnalités principales

- Inscription, connexion et rôles utilisateur / administrateur.
- Publication d'un besoin en deux étapes, suivie d'une validation par un administrateur.
- Exploration des annonces avec recherche, filtres et réinitialisation des filtres.
- Consultation du détail d'une annonce.
- Envoi d'une proposition avec message, tarif et disponibilités.
- Consultation des propositions reçues par le propriétaire d'une annonce.
- Acceptation d'une proposition et ajout facultatif d'une date de rendez-vous.
- Confirmation de fin de service : la proposition passe à l'état `TERMINE` et le paiement du prestataire est enregistré.
- Suivi des paiements de publication et de service depuis le détail de l'annonce.
- Signalement d'une annonce et notifications.
- Menu de profil et déconnexion accessibles depuis les pages de l'application.

> Les informations de paiement sont gérées par l'application pour le suivi du parcours. Aucun prestataire de paiement externe n'est configuré dans ce projet.

## Prérequis

- Node.js 20 ou une version compatible
- PostgreSQL
- npm

## Installation

Clonez le dépôt, puis installez les dépendances du backend et du frontend :

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## Base de données

1. Créez une base PostgreSQL.
2. Exécutez les scripts ci-dessous dans cet ordre. Les scripts complémentaires peuvent être relancés sans perdre les données existantes.

```text
MicroBesoins.sql
backend/src/db/mise-a-jour-schema.sql
backend/src/db/ajout-architecture-paiement.sql
backend/src/db/ajout-rdv-table-reponse.sql
backend/src/db/ajout-notification.sql
```

Pour charger des annonces et comptes d'exemple, exécutez aussi :

```text
backend/src/db/jeu-de-donnees-demo.sql
```

Les catégories sont définies dans la table `categorie`. Elles doivent être présentes dans la base pour que le sélecteur de catégorie de publication soit rempli.

## Configuration du backend

Créez le fichier `backend/.env` à partir de `backend/.env.example`, puis renseignez au minimum :

```env
PORT=3000
DATABASE_URL=postgresql://utilisateur:motdepasse@localhost:5432/microbesoins
JWT_SECRET=une-cle-secrete-solide
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:4200
```
1. `backend/src/db/mise-a-jour-schema.sql` — obligatoire pour une base existante : met à jour le schéma et initialise les catégories.
2. `backend/src/db/ajout-architecture-paiement.sql` — crée le stockage des intentions de paiement ; aucun prestataire de paiement réel n'est activé.
3. `backend/src/db/ajout-profil-public.sql` — obligatoire pour la page « Profil public » : ajoute les champs publics des utilisateurs et les informations nécessaires aux services réalisés et aux avis reçus.
4. `backend/src/db/jeu-de-donnees-demo.sql` — facultatif : ajoute des annonces de départ pour tester l'accueil, la recherche et les filtres.

## Lancer le projet

### Activer la page « Profil public »

**Avant d'utiliser la page, exécutez la migration [ajout-profil-public.sql](backend/src/db/ajout-profil-public.sql) sur la base PostgreSQL utilisée par l'API.** Il s'agit d'un script de mise à jour du schéma, pas d'une nouvelle base de données.

1. Vérifiez la base indiquée par `DATABASE_URL` dans `backend/.env`.
2. Dans pgAdmin, sélectionnez cette même base, puis ouvrez **Query Tool**.
3. Ouvrez le fichier `backend/src/db/ajout-profil-public.sql` et exécutez tout son contenu avec **F5**. Les tables initiales et la migration `mise-a-jour-schema.sql` doivent déjà avoir été appliquées.
4. Démarrez ou redémarrez le backend avec `npm run dev` depuis `backend`, puis le frontend avec `npm start` depuis `frontend`.
5. Ouvrez `http://localhost:4200/profil/ID`, en remplaçant `ID` par l'identifiant d'un utilisateur existant dans la table `utilisateur`.

Sans cette migration, l'API du profil peut renvoyer une erreur et la page ne peut pas charger les données. Le script peut être relancé sans supprimer les données existantes ; il n'ajoute pas de faux services ni d'avis. Un profil sans activité affiche les messages prévus à cet effet.

Pour plus de détails, consultez [la documentation du profil public](backend/PROFIL-PUBLIC.md).

Dans PostgreSQL ou dans pgAdmin, exécuter :

Dans un premier terminal :

```powershell
cd backend
npm run dev
```

Dans un second terminal :

```powershell
cd frontend
npm start
```

- Frontend : <http://localhost:4200>
- API : <http://localhost:3000>

## Parcours d'une annonce

1. Un demandeur publie son besoin.
2. Un administrateur valide la publication.
3. Les utilisateurs connectés peuvent envoyer une proposition.
4. Le demandeur consulte les propositions reçues, puis en accepte une.
5. Une fois le service effectué, le demandeur clique sur **Marquer le service terminé**.
6. L'application met la réponse à l'état `TERMINE` et crée l'enregistrement de paiement correspondant.

Les disponibilités saisies dans une proposition sont conservées avec le contenu de la réponse afin de rester compatibles avec le schéma partagé de la base de données.

## Documentation complémentaire

La documentation détaillée du serveur, des variables d'environnement, des migrations et des routes API est disponible dans [backend/README.md](backend/README.md).
