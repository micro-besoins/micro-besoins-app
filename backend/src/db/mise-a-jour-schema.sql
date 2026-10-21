-- Migration non destructive vers le schéma actuel Micro-Besoins.
-- À exécuter une seule fois sur une base existante.

BEGIN;

-- Conserve les hashes déjà enregistrés en renommant l'ancienne colonne.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateur' AND column_name = 'motdepasse'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateur' AND column_name = 'password'
  ) THEN
    ALTER TABLE utilisateur RENAME COLUMN motdepasse TO password;
  END IF;
END $$;

ALTER TABLE gig ADD COLUMN IF NOT EXISTS motif TEXT;
ALTER TABLE gig ADD COLUMN IF NOT EXISTS categorie VARCHAR(50);
ALTER TABLE gig ADD COLUMN IF NOT EXISTS localite VARCHAR(80);
ALTER TABLE gig ADD COLUMN IF NOT EXISTS dateSouhaitee TIMESTAMP;

-- Les catégories sont des données de référence : elles existent même sans annonce.
CREATE TABLE IF NOT EXISTS categorie (
  idCategorie INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO categorie (nom) VALUES
  ('Nettoyage'),
  ('Jardinage'),
  ('Aide informatique'),
  ('Petits travaux'),
  ('Cours particuliers')
ON CONFLICT (nom) DO NOTHING;

CREATE TABLE IF NOT EXISTS signalement (
  idSignalement INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idGig INT,
  idUtilisateur INT,
  motif TEXT NOT NULL,
  statusSignalement VARCHAR(20),
  dateSignalement TIMESTAMP,
  CONSTRAINT fk_signalement_gig
    FOREIGN KEY (idGig) REFERENCES gig(idGig) ON DELETE CASCADE,
  CONSTRAINT fk_signalement_utilisateur
    FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE
);

COMMIT;
