-- Messagerie liée à une annonce.
-- À exécuter après MicroBesoins.sql et les migrations précédentes.

CREATE TABLE IF NOT EXISTS conversation (
  idConversation INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idGig INT NOT NULL REFERENCES gig(idGig) ON DELETE CASCADE,
  idUtilisateur1 INT NOT NULL REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
  idUtilisateur2 INT NOT NULL REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
  dateCreation TIMESTAMP NOT NULL DEFAULT NOW(),
  dateModification TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_conversation_participants_distincts CHECK (idUtilisateur1 <> idUtilisateur2),
  CONSTRAINT ck_conversation_participants_ordonnes CHECK (idUtilisateur1 < idUtilisateur2),
  CONSTRAINT uq_conversation_gig_participants UNIQUE (idGig, idUtilisateur1, idUtilisateur2)
);

CREATE TABLE IF NOT EXISTS message (
  idMessage INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contenu TEXT NOT NULL,
  dateEnvoi TIMESTAMP NOT NULL DEFAULT NOW(),
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  idConversation INT NOT NULL REFERENCES conversation(idConversation) ON DELETE CASCADE,
  idUtilisateur INT NOT NULL REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_utilisateur1 ON conversation(idUtilisateur1);
CREATE INDEX IF NOT EXISTS idx_conversation_utilisateur2 ON conversation(idUtilisateur2);
CREATE INDEX IF NOT EXISTS idx_message_conversation_date ON message(idConversation, dateEnvoi);
