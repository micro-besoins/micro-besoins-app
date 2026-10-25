import { query } from '../db/query';
import { Paginated, PublicationDecisionResult, PublicationItem } from '../types/admin.types';
import { AppError } from '../utils/app-error';
import { GIG_STATUS } from '../utils/constants';
import { buildPagination } from '../utils/pagination';

export async function listPublications(status: string | undefined, page: number, limit: number): Promise<Paginated<PublicationItem>> {
  const failure = 'Impossible de récupérer la liste des publications.';
  const filter = status ? ' WHERE statusgig = $1' : '';
  const pagination = status ? [status, limit, (page - 1) * limit] : [limit, (page - 1) * limit];
  const limitPosition = status ? '$2' : '$1';
  const offsetPosition = status ? '$3' : '$2';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM gig${filter}`, status ? [status] : [], failure),
    query<PublicationItem>(
      `SELECT g.idgig            AS "idGig",
              g.titre            AS "titre",
              g.description      AS "description",
              g.budget           AS "budget",
              g.categorie        AS "categorie",
              g.localite         AS "localite",
              g.datesouhaitee    AS "dateSouhaitee",
              g.datepublication  AS "datePublication",
              g.statusgig        AS "status",
              g.motif            AS "motif",
              u.idutilisateur    AS "auteurId",
              u.nom              AS "auteurNom",
              u.prenom           AS "auteurPrenom",
              u.email            AS "auteurEmail"
         FROM gig g
         LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
        ${status ? 'WHERE g.statusgig = $1' : ''}
        ORDER BY g.datepublication DESC NULLS LAST, g.idgig DESC
        LIMIT ${limitPosition} OFFSET ${offsetPosition}`,
      pagination,
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
}

export async function getPublicationDetail(id: number) {
  const publication = await query<any>(
    `SELECT g.idgig AS "idGig", g.titre AS titre, g.description, g.budget::text AS budget,
            g.categorie, g.localite, g.datesouhaitee AS "dateSouhaitee", g.datepublication AS "datePublication",
            g.statusgig AS status, g.motif,
            u.idutilisateur AS "auteurId", u.prenom AS "auteurPrenom", u.nom AS "auteurNom", u.email AS "auteurEmail"
       FROM gig g JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
      WHERE g.idgig = $1`,
    [id],
    'Impossible de récupérer la publication.',
  );
  const item = publication.rows[0];
  if (!item) return null;

  const [payments, proposals, reviews] = await Promise.all([
    query<any>(
      `SELECT p.idpaiement AS id, p.montant::text AS amount, p.statuspaiement AS status, p.datepaiement AS date,
              CASE WHEN p.idreponse IS NULL THEN 'Frais de publication' ELSE 'Paiement du service' END AS label
         FROM paiement p
        WHERE p.idgig = $1 OR p.idreponse IN (SELECT idreponse FROM reponse WHERE idgig = $1)
        ORDER BY p.datepaiement DESC NULLS LAST, p.idpaiement DESC`, [id], 'Impossible de récupérer les paiements.'),
    query<any>(
      `SELECT r.idreponse AS id, r.contenu AS description, r.prixpropose::text AS amount, r.statusreponse AS status,
              u.idutilisateur AS "userId", u.prenom AS prenom, u.nom AS nom, u.email
         FROM reponse r JOIN utilisateur u ON u.idutilisateur = r.idutilisateur
        WHERE r.idgig = $1 ORDER BY r.datereponse DESC`, [id], 'Impossible de récupérer les propositions.'),
    query<any>(
      `SELECT a.idavis AS id, a.note AS rating, a.commentaire AS comment, u.prenom, u.nom
         FROM avis a JOIN utilisateur u ON u.idutilisateur = a.idutilisateur
        WHERE a.idgig = $1 ORDER BY a.dateavis DESC`, [id], 'Impossible de récupérer les avis.'),
  ]);
  return { ...item, payments: payments.rows, proposals: proposals.rows, reviews: reviews.rows };
}

/**
 * Accepte ou refuse une publication en attente.
 * - En cas de refus, `motif` (facultatif) est enregistré dans gig.motif.
 * - En cas d'acceptation, gig.motif est remis à NULL.
 * Le "AND statusgig = EN_ATTENTE" rend la mise à jour atomique : si deux admins
 * cliquent en même temps, un seul passe, l'autre reçoit une erreur 409.
 */
export async function decidePublication(
  id: number,
  decision: 'accept' | 'refuse',
  motif: string | null = null,
): Promise<PublicationDecisionResult> {
  const newStatus = decision === 'accept' ? GIG_STATUS.VALIDATED : GIG_STATUS.REFUSED;
  const savedMotif = decision === 'refuse' ? motif : null;

  const updated = await query<PublicationDecisionResult>(
    `UPDATE gig
        SET statusgig = $1, datemodification = NOW(), motif = $4
      WHERE idgig = $2 AND statusgig = $3
  RETURNING idgig AS "idGig", statusgig AS "status", motif AS "motif", datemodification AS "dateModification"`,
    [newStatus, id, GIG_STATUS.PENDING, savedMotif],
    'Impossible de mettre à jour le statut de la publication.',
  );
  if (updated.rows[0]) {
    if (decision === 'accept') {
      // Une annonce validée porte toujours ses frais de publication. La requête
      // reste idempotente pour les annonces déjà créées avec leur paiement en attente.
      await query(
        `INSERT INTO paiement (idgig, idutilisateur, methode, statuspaiement, montant, datepaiement)
         SELECT g.idgig, g.idutilisateur, 'mcb', 'REUSSI', 75, NOW()
           FROM gig g
          WHERE g.idgig = $1
            AND NOT EXISTS (
              SELECT 1 FROM paiement p
               WHERE p.idgig = g.idgig AND p.idreponse IS NULL
            )`,
        [id],
        'Impossible d’enregistrer les frais de publication.',
      );
      await query(
        `UPDATE paiement
            SET statuspaiement = 'REUSSI', datepaiement = COALESCE(datepaiement, NOW())
          WHERE idgig = $1 AND idreponse IS NULL`,
        [id],
        'Impossible de confirmer les frais de publication.',
      );
    }
    return updated.rows[0];
  }

  const existing = await query<{ status: string }>(
    'SELECT statusgig AS status FROM gig WHERE idgig = $1',
    [id],
    'Impossible de mettre à jour le statut de la publication.',
  );
  if (!existing.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Publication introuvable.');
  }
  throw new AppError(
    409,
    'ALREADY_PROCESSED',
    `Cette publication a déjà été traitée (statut actuel : ${existing.rows[0].status}).`,
  );
}
