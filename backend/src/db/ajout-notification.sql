-- Notifications (nouveau message, ...). À exécuter une fois sur la base microBesoins.
--   idUtilisateur  = destinataire de la notification
--   idExpediteur   = auteur du message qui l'a déclenchée
--   idConversation = conversation à ouvrir au clic (pas encore de clé étrangère :
--                    l'ajouter quand la table des conversations existera)
--   idGig          = besoin concerné (pour afficher son titre)
--   lue            = FALSE tant que l'utilisateur ne l'a pas ouverte (sert au badge rouge)
CREATE TABLE IF NOT EXISTS notification (
  idNotification   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idUtilisateur    INT NOT NULL,
  idExpediteur     INT,
  idConversation   INT,
  idGig            INT,
  typeNotification VARCHAR(30) NOT NULL DEFAULT 'NOUVEAU_MESSAGE',
  lue              BOOLEAN NOT NULL DEFAULT FALSE,
  dateCreation     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_notification_destinataire FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
  CONSTRAINT fk_notification_expediteur   FOREIGN KEY (idExpediteur)  REFERENCES utilisateur(idUtilisateur) ON DELETE SET NULL,
  CONSTRAINT fk_notification_gig          FOREIGN KEY (idGig)         REFERENCES gig(idGig)                 ON DELETE SET NULL,
  -- jamais de notification pour l'expéditeur lui-même
  CONSTRAINT chk_notification_pas_expediteur CHECK (idExpediteur IS NULL OR idExpediteur <> idUtilisateur)
);

-- Accélère le comptage des non lues et la liste triée par date
CREATE INDEX IF NOT EXISTS idx_notification_destinataire
  ON notification (idUtilisateur, lue, dateCreation DESC);
