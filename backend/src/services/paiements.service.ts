import { query } from '../db/query';
import { PaiementItem, Paginated } from '../types/admin.types';
import { buildPagination } from '../utils/pagination';

export async function listPayments(status: string | undefined, page: number, limit: number): Promise<Paginated<PaiementItem>> {
  const failure = 'Impossible de récupérer la liste des paiements.';
  const filter = status ? ' WHERE statuspaiement = $1' : '';
  const pagination = status ? [status, limit, (page - 1) * limit] : [limit, (page - 1) * limit];
  const limitPosition = status ? '$2' : '$1';
  const offsetPosition = status ? '$3' : '$2';
  const [totalResult, listResult] = await Promise.all([
    query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM paiement${filter}`, status ? [status] : [], failure),
    query<PaiementItem>(
      `SELECT p.idpaiement      AS "idPaiement",
              p.montant         AS "montant",
              p.methode         AS "methode",
              p.datepaiement    AS "datePaiement",
              p.statuspaiement  AS "status",
              p.idreponse       AS "idReponse",
              g.titre           AS "gigTitre",
              g.categorie       AS "gigCategory",
              g.localite        AS "gigLocation",
              u.idutilisateur   AS "payeurId",
              u.nom             AS "payeurNom",
              u.prenom          AS "payeurPrenom",
              u.email           AS "payeurEmail"
         FROM paiement p
         LEFT JOIN utilisateur u ON u.idutilisateur = p.idutilisateur
         LEFT JOIN reponse r     ON r.idreponse = p.idreponse
         LEFT JOIN gig g         ON g.idgig = COALESCE(p.idgig, r.idgig)
        ${status ? 'WHERE p.statuspaiement = $1' : ''}
        ORDER BY p.datepaiement DESC NULLS LAST, p.idpaiement DESC
        LIMIT ${limitPosition} OFFSET ${offsetPosition}`,
      pagination,
      failure,
    ),
  ]);

  return { data: listResult.rows, pagination: buildPagination(totalResult.rows[0].count, page, limit) };
}
