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
- Messagerie privée liée à une annonce : création automatique après une proposition, envoi et lecture des messages, conversations vides et notifications de nouveaux messages.
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
backend/src/db/ajout-messagerie.sql
backend/src/db/ajout-signalement-message.sql
backend/src/db/ajout-frais-publication-existants.sql
```

Pour charger des annonces d'exemple après avoir créé au moins un utilisateur, exécutez aussi :

```text
backend/src/db/jeu-de-donnees-demo.sql
```

Les catégories sont définies dans la table `categorie`. Elles doivent être présentes dans la base pour que le sélecteur de catégorie de publication soit rempli.

## Reproduire le même résultat de démonstration

Pour obtenir les annonces, les catégories, les paiements et les pages d'administration comme dans la démonstration, partez d'une base PostgreSQL vide et suivez cette séquence :

1. Exécutez les scripts de la section **Base de données**, dans l'ordre indiqué.
2. Lancez le backend et le frontend.
3. Créez deux comptes depuis l'interface : un compte demandeur et un compte destiné à l'administration.
4. Dans PostgreSQL, donnez le rôle administrateur au second compte en remplaçant l'adresse ci-dessous :

```sql
UPDATE utilisateur
SET role = 'ADMIN'
WHERE email = 'admin@exemple.mu';
```

5. Exécutez `backend/src/db/jeu-de-donnees-demo.sql`. Les annonces de démonstration seront associées au premier utilisateur créé et seront visibles dans **Explorer**.
6. Connectez-vous avec le compte administrateur pour accéder à `/admin` et valider les publications en attente. Chaque annonce validée reçoit automatiquement les frais de publication de **Rs 75**.

Pour une base qui contenait déjà des annonces validées, exécutez aussi `backend/src/db/ajout-frais-publication-existants.sql` : il ajoute les frais manquants et confirme les frais encore en attente, sans supprimer de donnée.

### Vérification rapide du parcours complet

1. Avec un demandeur, publiez un besoin ; il apparaît avec le statut `EN_ATTENTE`.
2. Avec l'administrateur, validez-le dans **Publications**.
3. Avec un autre utilisateur, ouvrez l'annonce et envoyez une proposition.
4. Revenez sur le détail avec le demandeur : la proposition, la conversation et le suivi de paiement doivent apparaître.
5. Acceptez la proposition, puis marquez le service comme terminé : le paiement du prestataire est créé.

## Configuration du backend

Créez le fichier `backend/.env` à partir de `backend/.env.example`, puis renseignez au minimum :

```env
PORT=3000
DATABASE_URL=postgresql://utilisateur:motdepasse@localhost:5432/microbesoins
JWT_SECRET=une-cle-secrete-solide
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:4200
```

## Lancer le projet

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

## Messagerie

Une conversation est toujours rattachée à un besoin et relie exactement deux utilisateurs. Elle est créée automatiquement après l'envoi d'une proposition, ou lorsqu'un utilisateur sélectionne **Contacter l'auteur**. Lors du premier clic sur ce bouton, l'application envoie automatiquement le message d'introduction « Bonjour, je vous contacte au sujet de … ». Une même paire d'utilisateurs ne peut avoir qu'une seule conversation pour le même besoin.

Après avoir exécuté `backend/src/db/ajout-messagerie.sql`, rendez-vous sur **Messages**. Une conversation peut être vide : le premier message est envoyé depuis le champ situé en bas de l'écran.

Le drapeau d'une conversation ouvre une modale permettant de signaler un contenu. Le motif est conservé dans `signalement_message` pour examen par l'administrateur.

Les disponibilités saisies dans une proposition sont conservées avec le contenu de la réponse afin de rester compatibles avec le schéma partagé de la base de données.

## Documentation complémentaire

La documentation détaillée du serveur, des variables d'environnement, des migrations et des routes API est disponible dans [backend/README.md](backend/README.md).
