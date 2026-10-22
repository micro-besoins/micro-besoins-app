import { query } from '../db/query';
import { PaiementItem, Paginated } from '../types/admin.types';
import { buildPagination } from '../utils/pagination';

export async function listPayments(status: string, page: number, limit: number): Promise<Paginated<PaiementItem>> {
  const failure = 'Impossible de récupérer la liste des paiements.';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>('SELECT COUNT(*)::int AS count FROM paiement WHERE statuspaiement = $1', [status], failure),
    query<PaiementItem>(
      `SELECT p.idpaiement      AS "idPaiement",
              p.montant         AS "montant",
              p.methode         AS "methode",
              p.datepaiement    AS "datePaiement",
              p.statuspaiement  AS "status",
              p.idreponse       AS "idReponse",
              g.titre           AS "gigTitre",
              u.idutilisateur   AS "payeurId",
              u.nom             AS "payeurNom",
              u.prenom          AS "payeurPrenom",
              u.email           AS "payeurEmail"
         FROM paiement p
         LEFT JOIN utilisateur u ON u.idutilisateur = p.idutilisateur
         LEFT JOIN reponse r     ON r.idreponse = p.idreponse
         LEFT JOIN gig g         ON g.idgig = r.idgig
        WHERE p.statuspaiement = $1
        ORDER BY p.datepaiement DESC NULLS LAST, p.idpaiement DESC
        LIMIT $2 OFFSET $3`,
      [status, limit, (page - 1) * limit],
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
}