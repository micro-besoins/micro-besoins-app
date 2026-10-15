-- À exécuter une fois sur la base microBesoins, ou à intégrer au script de création
-- de la table utilisateur. Contient le hash bcrypt du mot de passe (jamais le mot de passe en clair).
-- Si la table contient déjà des lignes de test, les supprimer avant (NOT NULL).
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS motDePasse VARCHAR(255) NOT NULL;
