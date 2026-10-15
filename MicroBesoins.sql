-- Créer la base de donnée "microBesoins"
-- Après la création crée les tables

CREATE TABLE utilisateur (
	idUtilisateur		INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	nom					VARCHAR(20) NOT NULL,
	prenom				VARCHAR(20) NOT NULL,
	email				VARCHAR(100) UNIQUE NOT NULL,
	password			VARCHAR(255) NOT NULL,
	roleUtilisateur		VARCHAR(20)
);

CREATE TABLE gig (
	idGig				INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	titre				VARCHAR(50) NOT NULL,
	description			TEXT NOT NULL,
	budget				DECIMAL(7,2) NOT NULL,
	datePublication		TIMESTAMP,
	dateModification	TIMESTAMP,
	statusGig			VARCHAR(20),
	motif				TEXT,
	idUtilisateur		INT,
	CONSTRAINT fk_gig_utilisateur FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE
);

CREATE TABLE reponse (
	idReponse			INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	contenu				TEXT NOT NULL,
	prixPropose			DECIMAL(7,2),
	dateReponse			TIMESTAMP,
	statusReponse		VARCHAR(20),
	idUtilisateur		INT,
	idGig				INT,
	CONSTRAINT fk_reponse_utilisateur FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
	CONSTRAINT fk_reponse_gig FOREIGN KEY (idGig) REFERENCES gig(idGig) ON DELETE CASCADE
);

CREATE TABLE paiement (
	idPaiement			INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	montant				DECIMAL(7,2) NOT NULL,
	methode				VARCHAR(10) NOT NULL,
	datePaiement		TIMESTAMP,
	statusPaiement		VARCHAR(20),
	idUtilisateur		INT,
	idReponse			INT,
	CONSTRAINT fk_paiement_utilisateur FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
	CONSTRAINT fk_paiement_reponse FOREIGN KEY (idReponse) REFERENCES reponse(idReponse) ON DELETE CASCADE
);

CREATE TABLE avis (
	idAvis				INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	note				INT NOT NULL,
	commentaire			TEXT,
	dateAvis			TIMESTAMP,
	idUtilisateur		INT,
	idGig				INT,
	CONSTRAINT fk_avis_utilisateur FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE,
	CONSTRAINT fk_avis_gig FOREIGN KEY (idGig) REFERENCES gig(idGig) ON DELETE CASCADE
);

CREATE TABLE signalement (
	idSignalement		INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	idGig				INT,
	idUtilisateur		INT,
	motif				TEXT NOT NULL,
	statusSignalement	VARCHAR(20),
	dateSignalement		TIMESTAMP,
	CONSTRAINT fk_signalement_gig FOREIGN KEY (idGig) REFERENCES gig(idGig) ON DELETE CASCADE,
	CONSTRAINT fk_signalement_utilisateur FOREIGN KEY (idUtilisateur) REFERENCES utilisateur(idUtilisateur) ON DELETE CASCADE
);