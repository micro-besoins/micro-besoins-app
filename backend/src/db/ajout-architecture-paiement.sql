-- Prépare le stockage des transactions de paiement sans activer de prestataire.
-- Les données de carte ne doivent jamais être enregistrées dans cette table.
CREATE TABLE IF NOT EXISTS payment_intent (
  idPaymentIntent INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idGig INT NOT NULL REFERENCES gig(idGig) ON DELETE CASCADE,
  idUtilisateur INT NOT NULL REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MUR',
  externalReference VARCHAR(255),
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
