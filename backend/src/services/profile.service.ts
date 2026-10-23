import { pool } from '../config/db';

export async function findPublicProfile(id: number) {
  // Liste explicite de champs publics : aucun email, hash, paiement ou adresse privée.
  const { rows: users } = await pool.query(
    `SELECT idutilisateur AS id, prenom AS "firstName", nom AS "lastName",
      localite AS location, biographie AS biography, dateinscription AS "joinedAt", competences AS skills
     FROM utilisateur WHERE idutilisateur = $1`, [id]);
  if (!users[0]) return null;
  const { rows: activities } = await pool.query(
    `WITH completed AS (
       SELECT g.idgig, g.titre, g.categorie, g.daterealisation, g.idutilisateur
       FROM gig g WHERE g.statusgig = 'TERMINE'
     ), activities AS (
       SELECT g.*, 'prestataire'::text AS role FROM completed g
       WHERE EXISTS (SELECT 1 FROM reponse r WHERE r.idgig = g.idgig
         AND r.idutilisateur = $1 AND r.statusreponse = 'ACCEPTEE')
       UNION ALL
       SELECT g.*, 'demandeur'::text AS role FROM completed g WHERE g.idutilisateur = $1
     )
     SELECT g.idgig AS id, g.titre AS title, g.categorie AS category,
       g.daterealisation AS "completedAt", g.role,
       COALESCE((SELECT json_agg(json_build_object('id', a.idavis, 'rating', a.note,
         'comment', a.commentaire, 'createdAt', a.dateavis) ORDER BY a.dateavis DESC NULLS LAST, a.idavis DESC)
         FROM avis a WHERE a.idgig = g.idgig AND a.iddestinataire = $1
           AND a.roledestinataire = g.role AND a.note BETWEEN 1 AND 5
           AND a.idutilisateur <> $1
           AND (g.role = 'prestataire' AND a.idutilisateur = g.idutilisateur
             OR g.role = 'demandeur' AND EXISTS (SELECT 1 FROM reponse r
               WHERE r.idgig = g.idgig AND r.idutilisateur = a.idutilisateur AND r.statusreponse = 'ACCEPTEE'))), '[]'::json) AS reviews
     FROM activities g ORDER BY g.daterealisation DESC NULLS LAST, g.idgig DESC`, [id]);
  const stats = (role: string) => {
    const entries = activities.filter((item) => item.role === role);
    const reviews = entries.flatMap((item) => item.reviews as { rating: number }[]);
    return { completedCount: entries.length, reviewCount: reviews.length,
      averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null };
  };
  return { ...users[0], provider: stats('prestataire'), requester: stats('demandeur'), activities };
}

export async function findMyProposals(userId: number) {
  const { rows } = await pool.query(
    `SELECT r.idreponse AS id, r.contenu AS content, r.statusreponse AS status,
      g.titre AS title, u.idutilisateur AS "ownerId", u.prenom AS "firstName", u.nom AS "lastName"
     FROM reponse r JOIN gig g ON g.idgig = r.idgig
     JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     WHERE r.idutilisateur = $1 ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`, [userId]);
  return rows;
}

export async function findGigProposals(gigId: number) {
  const { rows } = await pool.query(
    `SELECT r.idreponse AS id, r.contenu AS content, r.statusreponse AS status,
      u.idutilisateur AS "ownerId", u.prenom AS "firstName", u.nom AS "lastName"
     FROM reponse r JOIN utilisateur u ON u.idutilisateur = r.idutilisateur
     WHERE r.idgig = $1 ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`, [gigId]);
  return rows;
}
