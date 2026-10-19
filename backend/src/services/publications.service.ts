import { query } from '../db/query';
import { Paginated, PublicationDecisionResult, PublicationItem } from '../types/admin.types';
import { AppError } from '../utils/app-error';
import { GIG_STATUS } from '../utils/constants';
import { buildPagination } from '../utils/pagination';

export async function listPublications(status: string, page: number, limit: number): Promise<Paginated<PublicationItem>> {
  const failure = 'Impossible de récupérer la liste des publications.';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>('SELECT COUNT(*)::int AS count FROM gig WHERE statusgig = $1', [status], failure),
    query<PublicationItem>(
      `SELECT g.idgig            AS "idGig",
              g.titre            AS "titre",
              g.description      AS "description",
              g.budget           AS "budget",
              g.datepublication  AS "datePublication",
              g.statusgig        AS "status",
              g.motif            AS "motif",
              u.idutilisateur    AS "auteurId",
              u.nom              AS "auteurNom",
              u.prenom           AS "auteurPrenom",
              u.email            AS "auteurEmail"
         FROM gig g
         LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
        WHERE g.statusgig = $1
        ORDER BY g.datepublication DESC NULLS LAST, g.idgig DESC
        LIMIT $2 OFFSET $3`,
      [status, limit, (page - 1) * limit],
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
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
  if (updated.rows[0]) return updated.rows[0];

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