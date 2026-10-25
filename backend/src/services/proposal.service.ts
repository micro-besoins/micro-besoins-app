import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { GIG_STATUS } from '../utils/constants';

export interface ProposalInput {
  message: string;
  price: number;
  availability: string;
}

export async function createProposal(gigId: number, userId: number, input: ProposalInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Sérialise les envois pour un même besoin, y compris deux clics simultanés.
    const { rows } = await client.query(
      'SELECT idutilisateur, statusgig FROM gig WHERE idgig = $1 FOR UPDATE', [gigId]
    );
    const gig = rows[0];
    if (!gig) throw new AppError(404, 'Besoin introuvable.');
    if (gig.idutilisateur === userId) throw new AppError(403, 'Vous ne pouvez pas proposer vos services sur votre propre besoin.');
    if (gig.statusgig !== GIG_STATUS.VALIDATED) throw new AppError(409, 'Ce besoin ne reçoit plus de propositions.');
    const existing = await client.query('SELECT 1 FROM reponse WHERE idgig = $1 AND idutilisateur = $2', [gigId, userId]);
    if (existing.rowCount) throw new AppError(409, 'Vous avez déjà envoyé une proposition pour ce besoin.');
    const result = await client.query(
      `INSERT INTO reponse (contenu, prixpropose, disponibilites, datereponse, statusreponse, idutilisateur, idgig)
       VALUES ($1, $2, $3, NOW(), 'EN_ATTENTE', $4, $5)
       RETURNING idreponse AS id, contenu AS message, prixpropose::text AS price,
         disponibilites AS availability, datereponse AS "createdAt", statusreponse AS status, idgig AS "gigId"`,
      [input.message, input.price, input.availability, userId, gigId]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findMyProposals(userId: number) {
  const { rows } = await pool.query(
    `SELECT r.idreponse AS id, r.contenu AS message, r.prixpropose::text AS price,
       r.disponibilites AS availability, r.datereponse AS "createdAt", r.statusreponse AS status,
       g.idgig AS "gigId", g.titre AS "gigTitle", g.categorie AS category, g.localite AS location,
       u.prenom AS "ownerFirstName", u.nom AS "ownerLastName"
     FROM reponse r JOIN gig g ON g.idgig = r.idgig
     LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     WHERE r.idutilisateur = $1 ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`, [userId]
  );
  return rows;
}
