import { query } from '../db/query';
import { Paginated } from '../types/admin.types';
import { BesoinItem } from '../types/besoin.types';
import { GIG_STATUS } from '../utils/constants';
import { buildPagination } from '../utils/pagination';

export async function listApprovedNeeds(page: number, limit: number): Promise<Paginated<BesoinItem>> {
  const failure = 'Impossible de récupérer la liste des besoins.';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>('SELECT COUNT(*)::int AS count FROM gig WHERE statusgig = $1', [GIG_STATUS.VALIDATED], failure),
    query<BesoinItem>(
      `SELECT g.idgig            AS "idGig",
              g.titre            AS "titre",
              g.description      AS "description",
              g.budget           AS "budget",
              g.datepublication  AS "datePublication",
              u.idutilisateur    AS "auteurId",
              u.nom              AS "auteurNom",
              u.prenom           AS "auteurPrenom"
         FROM gig g
         LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
        WHERE g.statusgig = $1
        ORDER BY g.datepublication DESC NULLS LAST, g.idgig DESC
        LIMIT $2 OFFSET $3`,
      [GIG_STATUS.VALIDATED, limit, (page - 1) * limit],
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
}