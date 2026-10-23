import { pool } from '../config/db';
import { AppError } from '../utils/AppError';

// Une proposition reste dans l'historique après son retrait.
export async function findMyProposals(userId: number) {
  const { rows } = await pool.query(
    `SELECT r.idreponse AS id, r.prixpropose::text AS amount,
            r.datereponse AS "sentAt", r.statusreponse AS status, r.contenu AS content,
            g.idgig AS "gigId", g.titre AS title, to_jsonb(g)->>'categorie' AS category,
            u.prenom AS "ownerFirstName", u.nom AS "ownerLastName"
     FROM reponse r
     JOIN gig g ON g.idgig = r.idgig
     LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     WHERE r.idutilisateur = $1
     ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`,
    [userId]
  );
  return rows;
}

export async function withdrawProposal(id: number, userId: number) {
  // Le test du propriétaire et du statut fait partie de la même écriture atomique.
  const { rows } = await pool.query(
    `UPDATE reponse SET statusreponse = 'RETIREE'
     WHERE idreponse = $1 AND idutilisateur = $2 AND statusreponse = 'EN_ATTENTE'
     RETURNING idreponse AS id, statusreponse AS status`,
    [id, userId]
  );
  if (rows[0]) return rows[0];
  const existing = await pool.query(
    'SELECT 1 FROM reponse WHERE idreponse = $1 AND idutilisateur = $2', [id, userId]
  );
  if (!existing.rowCount) throw new AppError(404, 'Proposition introuvable.');
  throw new AppError(409, 'Seule une proposition en attente peut être retirée.');
}

export async function findProposalNeed(id: number, userId: number) {
  // L'auteur d'une proposition peut consulter son besoin même après sa clôture.
  const { rows } = await pool.query(
    `SELECT g.idgig AS id, g.titre AS title, g.description, g.budget::text AS budget,
            g.statusgig AS status, to_jsonb(g)->>'categorie' AS category,
            to_jsonb(g)->>'localite' AS location, to_jsonb(g)->>'datesouhaitee' AS "requestedAt",
            u.prenom AS "ownerFirstName", u.nom AS "ownerLastName"
     FROM reponse r JOIN gig g ON g.idgig = r.idgig
     LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     WHERE r.idreponse = $1 AND r.idutilisateur = $2`, [id, userId]
  );
  if (!rows[0]) throw new AppError(404, 'Besoin introuvable.');
  return rows[0];
}

export async function findProposalOwner(id: number, userId: number) {
  const { rows } = await pool.query(
    `SELECT u.prenom AS "firstName", u.nom AS "lastName",
            (SELECT COUNT(*)::int FROM gig published WHERE published.idutilisateur = u.idutilisateur
             AND published.statusgig = 'VALIDE') AS "publishedCount"
     FROM reponse r JOIN gig g ON g.idgig = r.idgig
     JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     WHERE r.idreponse = $1 AND r.idutilisateur = $2`, [id, userId]
  );
  if (!rows[0]) throw new AppError(404, 'Profil introuvable.');
  return rows[0];
}
