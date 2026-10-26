import { pool } from '../config/db';
import { GIG_STATUS, PAYMENT_STATUS, REPORT_STATUS } from '../utils/constants';

export interface GigFilters {
  keyword?: string;
  category?: string;
  location?: string;
  budget?: string;
}

export interface CreateGigInput {
  title: string;
  description: string;
  category: string;
  location: string;
  budget: number;
  requestedAt: string;
  ownerId: number;
}

export interface GigFilterOptions {
  categories: string[];
  locations: string[];
  budgets: string[];
}

interface GigCapabilities {
  hasCategory: boolean;
  hasLocation: boolean;
  hasRequestedDate: boolean;
}

async function getCapabilities(): Promise<GigCapabilities> {
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'gig'
       AND column_name IN ('categorie', 'localite', 'datesouhaitee')`
  );
  const columns = new Set(rows.map((row) => row.column_name));
  return {
    hasCategory: columns.has('categorie'),
    hasLocation: columns.has('localite'),
    hasRequestedDate: columns.has('datesouhaitee'),
  };
}

export async function getGigFilterOptions(): Promise<GigFilterOptions> {
  const capabilities = await getCapabilities();
  const queries = [
    pool.query<{ value: string }>(`SELECT nom AS value FROM categorie ORDER BY nom`),
    capabilities.hasLocation
      ? pool.query<{ value: string }>(`SELECT DISTINCT localite AS value FROM gig WHERE localite IS NOT NULL AND localite <> '' ORDER BY value`)
      : Promise.resolve({ rows: [] as { value: string }[] }),
    pool.query<{ value: string }>(
      `SELECT value FROM (SELECT DISTINCT budget::text AS value, budget FROM gig) AS filter_budgets ORDER BY budget`
    ),
  ];
  const [categories, locations, budgets] = await Promise.all(queries);
  return {
    categories: categories.rows.map((row) => row.value),
    locations: locations.rows.map((row) => row.value),
    budgets: budgets.rows.map((row) => row.value),
  };
}

export async function categoryExists(category: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM categorie WHERE nom = $1`,
    [category]
  );
  return (rowCount ?? 0) > 0;
}

function gigSelect(capabilities: GigCapabilities): string {
  const category = capabilities.hasCategory ? 'g.categorie' : 'NULL::text';
  const location = capabilities.hasLocation ? 'g.localite' : 'NULL::text';
  const requestedDate = capabilities.hasRequestedDate ? 'g.dateSouhaitee' : 'NULL::timestamp';
  return `SELECT g.idgig AS id, g.titre AS title, g.description, g.budget::text AS budget,
            g.datepublication AS "publishedAt", g.statusgig AS status,
            ${category} AS category, ${location} AS location, ${requestedDate} AS "requestedAt",
            u.idutilisateur AS "ownerId", u.nom AS "ownerLastName", u.prenom AS "ownerFirstName",
            COUNT(r.idreponse) FILTER (WHERE COALESCE(r.statusreponse, 'EN_ATTENTE') <> 'RETIREE')::int AS "proposalCount"
     FROM gig g
     LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     LEFT JOIN reponse r ON r.idgig = g.idgig`;
}

export async function findGigs(filters: GigFilters) {
  const capabilities = await getCapabilities();
  const values: string[] = [];
  const conditions: string[] = [`g.statusgig = '${GIG_STATUS.VALIDATED}'`];
  const add = (condition: string, value: string) => {
    values.push(value);
    conditions.push(condition.replace('?', `$${values.length}`));
  };

  if (filters.keyword) {
    values.push(filters.keyword, filters.keyword);
    conditions.push(`(g.titre ILIKE '%' || $${values.length - 1} || '%' OR g.description ILIKE '%' || $${values.length} || '%')`);
  }
  if (filters.category && capabilities.hasCategory) add('g.categorie = ?', filters.category);
  if (filters.location && capabilities.hasLocation) add('g.localite = ?', filters.location);
  if (filters.budget === 'under-1000') conditions.push('g.budget < 1000');
  if (filters.budget === '1000-2000') conditions.push('g.budget >= 1000 AND g.budget <= 2000');
  if (filters.budget === 'over-2000') conditions.push('g.budget > 2000');

  const category = capabilities.hasCategory ? 'g.categorie' : 'NULL::text';
  const location = capabilities.hasLocation ? 'g.localite' : 'NULL::text';
  const requestedDate = capabilities.hasRequestedDate ? 'g.dateSouhaitee' : 'NULL::timestamp';
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${gigSelect(capabilities)}
     ${where}
     GROUP BY g.idgig, u.idutilisateur
     ORDER BY g.datepublication DESC NULLS LAST, g.idgig DESC`,
    values
  );
  return rows;
}

export async function findGigById(id: number, viewerId: number | null) {
  const capabilities = await getCapabilities();
  const { rows } = await pool.query(
    `${gigSelect(capabilities)}
     WHERE g.idgig = $1
     GROUP BY g.idgig, u.idutilisateur`,
    [id]
  );
  const gig = rows[0];
  if (!gig) return null;
 
  const isOwner = viewerId !== null && Number(gig.ownerId) === Number(viewerId);
  if (gig.status !== GIG_STATUS.VALIDATED && !isOwner) return null;
 
  const payments = isOwner
    ? (await pool.query<{ amount: string; status: string | null; paidAt: string | null; responseId: number | null }>(
      `SELECT p.montant::text AS amount, p.statuspaiement AS status, p.datepaiement AS "paidAt", p.idreponse AS "responseId"
         FROM paiement p
         LEFT JOIN reponse r ON r.idreponse = p.idreponse
        WHERE p.idgig = $1
          AND (p.idreponse IS NULL OR r.statusreponse = 'TERMINE')
        ORDER BY idpaiement DESC`,
      [id],
    )).rows
    : [];

  let proposals: any[] = [];
  if (isOwner) {
    const { rows: props } = await pool.query(
      `SELECT r.idreponse AS id,
              r.contenu AS message,
              r.prixpropose AS montant,
              r.statusreponse AS status,
              r.date_rendez_vous AS "dateRdv",
              u.idutilisateur AS "auteurId",
              u.prenom AS "auteurPrenom",
              u.nom AS "auteurNom"
        FROM reponse r
        JOIN utilisateur u ON u.idutilisateur = r.idutilisateur
        WHERE r.idgig = $1
          AND COALESCE(r.statusreponse, 'EN_ATTENTE') <> 'RETIREE'
        ORDER BY r.datereponse DESC`,
      [id]
    );
    proposals = props;
  }

  return { ...gig, isOwner, payments, proposals };
}

export async function findGigsByOwner(ownerId: number) {
  const capabilities = await getCapabilities();
  const { rows } = await pool.query(
    `${gigSelect(capabilities)}
     WHERE g.idutilisateur = $1
     GROUP BY g.idgig, u.idutilisateur
     ORDER BY g.datepublication DESC NULLS LAST, g.idgig DESC`,
    [ownerId]
  );
  return rows;
}

export async function reportGig(id: number, reporterId: number, reason: string) {
  const { rows: gigs } = await pool.query<{ status: string }>(
    `SELECT statusgig AS status FROM gig WHERE idgig = $1`,
    [id],
  );
  if (!gigs[0] || gigs[0].status !== GIG_STATUS.VALIDATED) return null;

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO signalement (idgig, idutilisateur, motif, statussignalement, datesignalement)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING idsignalement AS id`,
    [id, reporterId, reason, REPORT_STATUS.OPEN],
  );
  return rows[0];
}

export async function createGig(input: CreateGigInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: number; title: string }>(
      `INSERT INTO gig (titre, description, budget, datePublication, dateModification, statusGig, categorie, localite, dateSouhaitee, idUtilisateur)
       VALUES ($1, $2, $3, NOW(), NOW(), $8, $4, $5, $6, $7)
       RETURNING idGig AS id, titre AS title`,
      [input.title, input.description, input.budget, input.category, input.location, input.requestedAt, input.ownerId, GIG_STATUS.PENDING]
    );
    await client.query(
      `INSERT INTO paiement (idgig, idutilisateur, methode, statuspaiement, montant)
       VALUES ($1, $2, 'mcb', 'EN_ATTENTE', 75)`,
      [rows[0].id, input.ownerId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function accepterProposition(idReponse: number, ownerId: number, dateRdv: string | null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT r.idgig, g.idutilisateur AS "ownerId"
        FROM reponse r JOIN gig g ON g.idgig = r.idgig
        WHERE r.idreponse = $1`,
      [idReponse]
    );

    const reponse = rows[0];
    if (!reponse) throw new Error("Proposition introuvable.");
    if (Number(reponse.ownerId) !== Number(ownerId)) throw new Error("Vous n'êtes pas le propriétaire de cette annonce.");
    
    const accepted = await client.query(
      `UPDATE reponse SET statusreponse = 'ACCEPTE', date_rendez_vous = $1
        WHERE idreponse = $2 AND statusreponse = 'EN_ATTENTE'`,
      [dateRdv, idReponse]
    );
    if (accepted.rowCount === 0) throw new Error('Cette proposition a déjà été traitée.');
    
    await client.query(
      `UPDATE reponse SET statusreponse = 'REFUSE'
        WHERE idgig = $1 AND idreponse != $2 AND statusreponse = 'EN_ATTENTE'`,
      [reponse.idgig, idReponse]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function terminerProposition(idReponse: number, ownerId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ idgig: number; montant: string; ownerId: number; providerId: number }>(
      `SELECT r.idgig, r.prixpropose AS montant, g.idutilisateur AS "ownerId", r.idutilisateur AS "providerId"
         FROM reponse r
         JOIN gig g ON g.idgig = r.idgig
        WHERE r.idreponse = $1
        FOR UPDATE`,
      [idReponse],
    );
    const response = rows[0];
    if (!response) throw new Error('Proposition introuvable.');
    if (Number(response.ownerId) !== Number(ownerId)) throw new Error('Vous n’êtes pas le propriétaire de cette annonce.');

    const completed = await client.query(
      `UPDATE reponse
          SET statusreponse = 'TERMINE'
        WHERE idreponse = $1 AND statusreponse = 'ACCEPTE'`,
      [idReponse],
    );
    if (completed.rowCount === 0) throw new Error('Seule une proposition acceptée peut être terminée.');

    await client.query(
      `INSERT INTO paiement (montant, methode, datepaiement, statuspaiement, idutilisateur, idreponse, idgig)
       SELECT r.prixpropose, 'plateforme', NOW(), 'REUSSI', r.idutilisateur, r.idreponse, r.idgig
         FROM reponse r
        WHERE r.idreponse = $1
          AND NOT EXISTS (SELECT 1 FROM paiement p WHERE p.idreponse = r.idreponse)`,
      [idReponse],
    );
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createProposition(gigId: number, userId: number, message: string, montant: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: gigs } = await client.query<{ ownerId: number; status: string | null }>(
      'SELECT idutilisateur AS "ownerId", statusgig AS status FROM gig WHERE idgig = $1 FOR KEY SHARE',
      [gigId],
    );
    const gig = gigs[0];
    if (!gig) throw new Error('Besoin introuvable.');
    if (Number(gig.ownerId) === Number(userId)) throw new Error('Vous ne pouvez pas proposer vos services sur votre propre besoin.');
    if (gig.status !== GIG_STATUS.VALIDATED) throw new Error('Ce besoin n’est pas disponible pour les propositions.');

    const existing = await client.query(
      `SELECT 1
         FROM reponse
        WHERE idgig = $1
          AND idutilisateur = $2
          AND COALESCE(statusreponse, 'EN_ATTENTE') <> 'RETIREE'
        LIMIT 1`,
      [gigId, userId],
    );
    if ((existing.rowCount ?? 0) > 0) throw new Error('Vous avez déjà envoyé une proposition pour ce besoin.');

    const { rows } = await client.query(
      `INSERT INTO reponse (idgig, idutilisateur, contenu, prixpropose, statusreponse, datereponse)
       VALUES ($1, $2, $3, $4, 'EN_ATTENTE', NOW())
       RETURNING idreponse AS id`,
      [gigId, userId, message, montant],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
