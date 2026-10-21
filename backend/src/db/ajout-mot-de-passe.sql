-- À exécuter une fois sur la base microBesoins, ou à intégrer au script de création
-- de la table utilisateur.
-- Correction du typo : le code backend (auth.service.ts) utilise la colonne motDePasse,
-- alors que MicroBesoins.sql la créait sous le nom password. On renomme pour aligner.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'utilisateur' AND LOWER(column_name) = 'password'
	)
	AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'utilisateur' AND LOWER(column_name) = 'motdepasse'
	) THEN
		ALTER TABLE utilisateur RENAME COLUMN password TO motDePasse;
	ELSIF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'utilisateur' AND LOWER(column_name) = 'password'
	)
	AND EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'utilisateur' AND LOWER(column_name) = 'motdepasse'
	) THEN
		-- Les deux colonnes existent (ancien correctif exécuté) : password est un résidu inutilisé.
		ALTER TABLE utilisateur DROP COLUMN password;
	END IF;
END $$;
