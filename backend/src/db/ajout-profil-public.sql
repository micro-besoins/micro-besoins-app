-- À exécuter après mise-a-jour-schema.sql. Migration réexécutable.
BEGIN;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS localite VARCHAR(80);
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS biographie TEXT;
-- Pas de date fictive pour les comptes historiques.
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS dateInscription TIMESTAMP;
ALTER TABLE utilisateur ALTER COLUMN dateInscription SET DEFAULT NOW();
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS competences TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE gig ADD COLUMN IF NOT EXISTS dateRealisation TIMESTAMP;
-- idUtilisateur reste l'auteur de l'avis. Les avis historiques sans destinataire
-- explicite ne sont pas attribués arbitrairement à un profil.
ALTER TABLE avis ADD COLUMN IF NOT EXISTS idDestinataire INT REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE;
ALTER TABLE avis ADD COLUMN IF NOT EXISTS roleDestinataire VARCHAR(20)
  CHECK (roleDestinataire IN ('prestataire', 'demandeur'));
CREATE INDEX IF NOT EXISTS avis_destinataire_idx ON avis(idDestinataire, idGig);
CREATE INDEX IF NOT EXISTS reponse_prestataire_idx ON reponse(idUtilisateur, idGig);
COMMIT;
