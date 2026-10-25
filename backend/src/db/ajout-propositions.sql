-- À exécuter après mise-a-jour-schema.sql, sur chaque base de l'équipe.
-- Les anciennes réponses sont conservées ; leur disponibilité reste NULL.
BEGIN;
ALTER TABLE reponse ADD COLUMN IF NOT EXISTS disponibilites VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_reponse_utilisateur_gig ON reponse (idutilisateur, idgig);
COMMIT;
