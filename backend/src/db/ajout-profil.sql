-- Complément MB-55 : appliquer d'abord ajout-profil-public.sql (MB-56).
-- Les colonnes de profil et la date d'inscription sont réutilisées.
BEGIN;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS nompublic VARCHAR(80);
COMMIT;
