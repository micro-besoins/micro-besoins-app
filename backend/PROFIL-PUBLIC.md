# Profil public — MB-56

Après les migrations existantes, appliquer `src/db/ajout-profil-public.sql` sur PostgreSQL. Ce script peut être relancé sans supprimer de données. Les anciens comptes gardent une date d'inscription inconnue, sans date inventée. Les nouveaux comptes reçoivent automatiquement la date courante.

La page Angular est accessible à `/profil/:id`. L'API `GET /api/users/:id/public` est publique et ne sélectionne que le nom, le prénom, la localité publique, la biographie, les compétences, la date d'inscription et l'historique public des services terminés avec les avis reçus. Aucun email, mot de passe, paiement, budget ou contenu de proposition n'est renvoyé.

Les services accomplis correspondent aux besoins `TERMINE` avec une réponse `ACCEPTEE` du prestataire. `gig.dateRealisation` est la date de réalisation facultative. Les besoins terminés du demandeur sont comptés séparément. Ces statuts doivent être enregistrés par le parcours de réalisation du service.

Dans `avis`, `idUtilisateur` désigne l'auteur ; `idDestinataire` et `roleDestinataire` (`prestataire` ou `demandeur`) identifient explicitement la personne évaluée. Les anciens avis sans destinataire ne sont pas attribués automatiquement : les renseigner après vérification métier. Seuls les avis de 1 à 5 écrits par l'autre participant au service terminé sont affichés et comptabilisés. Les auto-évaluations sont exclues. Aucun faux avis ou compteur n'est ajouté.

Depuis Explorer, cliquer sur le nom du demandeur ou sur « Voir le détail ». Le propriétaire d'un besoin peut consulter les profils des auteurs des propositions reçues. La page « Mes propositions » permet de consulter le profil du demandeur de chaque besoin. `GET /api/proposals/mine` exige une authentification ; les propositions reçues dans `GET /api/gigs/:id` sont réservées au propriétaire.

Validation : `npm run build` dans frontend et `npm run typecheck` dans backend. Pour les tests PostgreSQL/HTTP : définir `TEST_DATABASE_URL` vers une base de test accessible puis lancer `npm run test:profile` dans backend. Le test crée et supprime un schéma isolé et vérifie la migration réexécutable, les moyennes, l'absence d'avis, les champs publics et les contrôles d'accès. Sans `TEST_DATABASE_URL`, cette suite est ignorée explicitement.
