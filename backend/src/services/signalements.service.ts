import { query } from '../db/query';
import { Paginated, SignalementItem, SignalementProcessResult } from '../types/admin.types';
import { AppError } from '../utils/app-error';
import { REPORT_STATUS } from '../utils/constants';
import { buildPagination } from '../utils/pagination';

export async function listReports(status: string, page: number, limit: number): Promise<Paginated<SignalementItem>> {
  const failure = 'Impossible de récupérer la liste des signalements.';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>('SELECT COUNT(*)::int AS count FROM signalement WHERE statussignalement = $1', [status], failure),
    query<SignalementItem>(
      `SELECT s.idsignalement     AS "idSignalement",
              s.motif             AS "motif",
              s.datesignalement   AS "dateSignalement",
              s.statussignalement AS "status",
              s.idgig             AS "idGig",
              g.titre             AS "gigTitre",
              g.statusgig         AS "gigStatus",
              u.idutilisateur     AS "signaleurId",
              u.nom               AS "signaleurNom",
              u.prenom            AS "signaleurPrenom",
              u.email             AS "signaleurEmail"
         FROM signalement s
         LEFT JOIN gig g         ON g.idgig = s.idgig
         LEFT JOIN utilisateur u ON u.idutilisateur = s.idutilisateur
        WHERE s.statussignalement = $1
        ORDER BY s.datesignalement DESC NULLS LAST, s.idsignalement DESC
        LIMIT $2 OFFSET $3`,
      [status, limit, (page - 1) * limit],
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
}

/** Marque un signalement (ouvert ou en cours) comme traité. */
export async function processReport(id: number): Promise<SignalementProcessResult> {
  const failure = 'Impossible de traiter le signalement.';

  const updated = await query<SignalementProcessResult>(
    `UPDATE signalement
        SET statussignalement = $1
      WHERE idsignalement = $2 AND statussignalement IN ($3, $4)
  RETURNING idsignalement AS "idSignalement", statussignalement AS "status"`,
    [REPORT_STATUS.PROCESSED, id, REPORT_STATUS.OPEN, REPORT_STATUS.IN_PROGRESS],
    failure,
  );
  if (updated.rows[0]) return updated.rows[0];

  const existing = await query<{ status: string }>(
    'SELECT statussignalement AS status FROM signalement WHERE idsignalement = $1',
    [id],
    failure,
  );
  if (!existing.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Signalement introuvable.');
  }
  throw new AppError(
    409,
    'ALREADY_PROCESSED',
    `Ce signalement a déjà été traité (statut actuel : ${existing.rows[0].status}).`,
  );
}