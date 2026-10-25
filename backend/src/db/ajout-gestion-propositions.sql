-- À exécuter après mise-a-jour-schema.sql. Migration réexécutable, sans suppression.
BEGIN;
ALTER TABLE reponse ADD COLUMN IF NOT EXISTS disponibilite TEXT;
CREATE INDEX IF NOT EXISTS idx_reponse_gig ON reponse(idgig);
COMMIT;
