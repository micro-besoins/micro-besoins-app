-- Données de démonstration pour vérifier la recherche et les filtres.
-- À exécuter après mise-a-jour-schema.sql.
-- Elles n'écrasent aucune annonce existante et peuvent être supprimées par titre.

INSERT INTO gig (
  titre, description, budget, datePublication, dateModification, statusGig,
  categorie, localite, dateSouhaitee, idUtilisateur
)
SELECT seed.titre, seed.description, seed.budget, NOW(), NOW(), 'VALIDE',
       seed.categorie, seed.localite, seed.dateSouhaitee,
       (SELECT idUtilisateur FROM utilisateur ORDER BY idUtilisateur LIMIT 1)
FROM (
  VALUES
    ('Nettoyage des vitres d''une maison',
     'Je recherche une personne soigneuse pour nettoyer les vitres intérieures et extérieures d''une maison de deux étages.',
     1500.00, 'Nettoyage', 'Quatre Bornes', TIMESTAMP '2026-10-24 09:00:00'),
    ('Entretien d''un petit jardin',
     'Tonte, taille de deux haies et évacuation des déchets verts pour un jardin d''environ 90 m².',
     2000.00, 'Jardinage', 'Moka', TIMESTAMP '2026-10-25 09:00:00'),
    ('Cours de mathématiques niveau Form 4',
     'Recherche une personne pédagogue pour une heure de révision en algèbre, à domicile ou en ligne.',
     700.00, 'Cours particuliers', 'Curepipe', TIMESTAMP '2026-10-20 16:00:00'),
    ('Fixer trois étagères murales',
     'Trois étagères à poser dans un appartement. Les étagères sont déjà montées, il faut apporter les fixations adaptées.',
     1200.00, 'Petits travaux', 'Port-Louis', TIMESTAMP '2026-10-24 10:00:00')
) AS seed(titre, description, budget, categorie, localite, dateSouhaitee)
WHERE NOT EXISTS (SELECT 1 FROM gig WHERE gig.titre = seed.titre);
