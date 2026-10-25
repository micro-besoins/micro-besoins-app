import { pool } from '../config/db';
import { AppError } from '../utils/AppError';

const proposalSelect = `SELECT r.idreponse AS id, r.idutilisateur AS "providerId",
  u.prenom AS "firstName", u.nom AS "lastName", r.contenu AS message,
  r.prixpropose::text AS amount, r.disponibilite AS availability,
  r.datereponse AS "createdAt", COALESCE(r.statusreponse, 'EN_ATTENTE') AS status
  FROM reponse r JOIN utilisateur u ON u.idutilisateur = r.idutilisateur`;

export async function listProposals(gigId: number, viewerId: number) {
  const { rows } = await pool.query('SELECT idutilisateur FROM gig WHERE idgig = $1', [gigId]);
  if (!rows[0]) throw new AppError(404, 'Besoin introuvable.');
  if (rows[0].idutilisateur !== viewerId) throw new AppError(403, 'Seul le propriétaire peut consulter les propositions reçues.');
  const result = await pool.query(`${proposalSelect} WHERE r.idgig = $1 ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`, [gigId]);
  return result.rows;
}

export async function decideProposal(gigId: number, proposalId: number, ownerId: number, decision: 'accept' | 'refuse') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Toutes les décisions et soumissions sur ce besoin prennent le même verrou.
    const gig = (await client.query('SELECT idutilisateur, statusgig FROM gig WHERE idgig = $1 FOR UPDATE', [gigId])).rows[0];
    if (!gig) throw new AppError(404, 'Besoin introuvable.');
    if (gig.idutilisateur !== ownerId) throw new AppError(403, 'Seul le propriétaire peut gérer les propositions reçues.');
    const proposal = (await client.query('SELECT statusreponse FROM reponse WHERE idgig = $1 AND idreponse = $2 FOR UPDATE', [gigId, proposalId])).rows[0];
    if (!proposal) throw new AppError(404, 'Proposition introuvable.');
    if (gig.statusgig !== 'VALIDE' || (proposal.statusreponse ?? 'EN_ATTENTE') !== 'EN_ATTENTE') {
      throw new AppError(409, 'Ce besoin ou cette proposition a déjà été traité. Actualisez la liste.');
    }
    if (decision === 'accept') {
      const accepted = await client.query("SELECT 1 FROM reponse WHERE idgig = $1 AND statusreponse = 'ACCEPTEE'", [gigId]);
      if (accepted.rowCount) throw new AppError(409, 'Une proposition a déjà été acceptée pour ce besoin.');
    }
    await client.query('UPDATE reponse SET statusreponse = $1 WHERE idgig = $2 AND idreponse = $3', [decision === 'accept' ? 'ACCEPTEE' : 'REFUSEE', gigId, proposalId]);
    if (decision === 'accept') {
      await client.query("UPDATE reponse SET statusreponse = 'REFUSEE' WHERE idgig = $1 AND idreponse <> $2 AND COALESCE(statusreponse, 'EN_ATTENTE') = 'EN_ATTENTE'", [gigId, proposalId]);
      await client.query("UPDATE gig SET statusgig = 'EN_COURS', datemodification = NOW() WHERE idgig = $1", [gigId]);
    }
    const result = await client.query(`${proposalSelect} WHERE r.idgig = $1 ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`, [gigId]);
    const updatedGig = (await client.query('SELECT statusgig AS status FROM gig WHERE idgig = $1', [gigId])).rows[0];
    await client.query('COMMIT');
    return { proposals: result.rows, gigStatus: updatedGig.status };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function submitProposal(gigId: number, providerId: number, amount: number, availability: string, message: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const gig = (await client.query('SELECT idutilisateur, statusgig FROM gig WHERE idgig = $1 FOR UPDATE', [gigId])).rows[0];
    if (!gig) throw new AppError(404, 'Besoin introuvable.');
    if (gig.idutilisateur === providerId) throw new AppError(403, 'Vous ne pouvez pas proposer vos services pour votre propre besoin.');
    if (gig.statusgig !== 'VALIDE') throw new AppError(409, 'Ce besoin ne reçoit plus de propositions.');
    const existing = await client.query('SELECT 1 FROM reponse WHERE idgig = $1 AND idutilisateur = $2', [gigId, providerId]);
    if (existing.rowCount) throw new AppError(409, 'Vous avez déjà envoyé une proposition pour ce besoin.');
    await client.query(`INSERT INTO reponse (idgig, idutilisateur, prixpropose, disponibilite, contenu, datereponse, statusreponse)
      VALUES ($1, $2, $3, $4, $5, NOW(), 'EN_ATTENTE')`, [gigId, providerId, amount, availability, message]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

// Profil public : aucune adresse email, aucun hash ni information de connexion.
export async function publicProfile(providerId: number) {
  const { rows } = await pool.query(`SELECT u.idutilisateur AS id, u.prenom AS "firstName", u.nom AS "lastName",
    (SELECT COUNT(*)::int FROM reponse r WHERE r.idutilisateur = u.idutilisateur AND r.statusreponse = 'ACCEPTEE') AS "acceptedCount"
    FROM utilisateur u WHERE u.idutilisateur = $1`, [providerId]);
  if (!rows[0]) throw new AppError(404, 'Profil introuvable.');
  return rows[0];
}
