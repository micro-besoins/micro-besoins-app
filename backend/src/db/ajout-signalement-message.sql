-- Signalements de contenus échangés dans la messagerie.
-- À exécuter après ajout-messagerie.sql.

CREATE TABLE IF NOT EXISTS signalement_message (
  idSignalementMessage INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idConversation INT NOT NULL REFERENCES conversation(idConversation) ON DELETE CASCADE,
  idMessage INT REFERENCES message(idMessage) ON DELETE SET NULL,
  idUtilisateur INT NOT NULL REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
  motif TEXT NOT NULL,
  statutSignalement VARCHAR(20) NOT NULL DEFAULT 'OUVERT',
  dateSignalement TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signalement_message_conversation ON signalement_message(idConversation);
