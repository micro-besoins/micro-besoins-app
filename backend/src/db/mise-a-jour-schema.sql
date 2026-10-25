-- Migration non destructive vers le schéma actuel Micro-Besoins.
-- À exécuter une seule fois sur une base existante.

BEGIN;

-- Aligne la base sur la convention de l'équipe, sans perdre les hashes existants.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateur' AND column_name = 'password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateur' AND column_name = 'motdepasse'
  ) THEN
    ALTER TABLE utilisateur RENAME COLUMN password TO motdepasse;
  END IF;
END $$;

ALTER TABLE gig ADD COLUMN IF NOT EXISTS motif TEXT;
ALTER TABLE gig ADD COLUMN IF NOT EXISTS categorie VARCHAR(50);
ALTER TABLE gig ADD COLUMN IF NOT EXISTS localite VARCHAR(80);
ALTER TABLE gig ADD COLUMN IF NOT EXISTS dateSouhaitee TIMESTAMP;

-- Un paiement peut concerner la publication d'un besoin ou une réponse acceptée.
ALTER TABLE paiement ADD COLUMN IF NOT EXISTS idGig INT;
ALTER TABLE paiement ALTER COLUMN idReponse DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_paiement_gig'
      AND conrelid = 'paiement'::regclass
  ) THEN
    ALTER TABLE paiement
      ADD CONSTRAINT fk_paiement_gig
      FOREIGN KEY (idGig) REFERENCES gig(idGig) ON DELETE CASCADE;
  END IF;
END $$;

-- Harmonise les anciens statuts avec ceux utilisés par l'API d'administration.
UPDATE gig
SET statusGig = CASE LOWER(statusGig)
  WHEN 'publie' THEN 'VALIDE'
  WHEN 'publié' THEN 'VALIDE'
  WHEN 'valide' THEN 'VALIDE'
  WHEN 'en_attente' THEN 'EN_ATTENTE'
  WHEN 'refuse' THEN 'REFUSE'
  WHEN 'refusé' THEN 'REFUSE'
  ELSE statusGig
END
WHERE LOWER(statusGig) IN ('publie', 'publié', 'valide', 'en_attente', 'refuse', 'refusé');

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

-- Harmonise les statuts de l'ancienne table technique de paiement.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_intent'
  ) THEN
    ALTER TABLE payment_intent ALTER COLUMN status SET DEFAULT 'EN_ATTENTE';
    UPDATE payment_intent SET status = 'EN_ATTENTE' WHERE status = 'pending';
  END IF;
END $$;

COMMIT;
