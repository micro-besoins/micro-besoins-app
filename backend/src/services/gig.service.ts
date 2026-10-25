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

export interface CreateProposalInput {
  gigId: number;
  providerId: number;
  content: string;
  price: number;
  availability: string;
}

export interface ProposalDetail {
  id: number;
  content: string;
  price: string;
  availability: string | null;
  sentAt: Date | null;
  status: string | null;
  providerId: number | null;
  providerFirstName: string | null;
  providerLastName: string | null;
}

interface ProposalRow {
  id: number;
  storedContent: string;
  price: string;
  sentAt: Date | null;
  status: string | null;
  providerId: number | null;
  providerFirstName: string | null;
  providerLastName: string | null;
}

const AVAILABILITY_SEPARATOR = '\n\nDisponibilités : ';

function readProposalContent(storedContent: string): Pick<ProposalDetail, 'content' | 'availability'> {
  const separatorIndex = storedContent.lastIndexOf(AVAILABILITY_SEPARATOR);
  if (separatorIndex < 0) return { content: storedContent, availability: null };
  return {
    content: storedContent.slice(0, separatorIndex),
    availability: storedContent.slice(separatorIndex + AVAILABILITY_SEPARATOR.length).trim() || null,
  };
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
            COUNT(r.idreponse)::int AS "proposalCount"
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
 
  const isOwner = viewerId !== null && gig.ownerId === viewerId;
  if (gig.status !== GIG_STATUS.VALIDATED && !isOwner) return null;
 
  const payments = isOwner
    ? (await pool.query<{ amount: string; status: string | null; paidAt: string | null }>(
      `SELECT montant::text AS amount, statuspaiement AS status, datepaiement AS "paidAt"
         FROM paiement
        WHERE idgig = $1
        ORDER BY idpaiement DESC`,
      [id],
    )).rows
    : [];

  const proposalRows = isOwner
    ? (await pool.query<ProposalRow>(
      `SELECT r.idreponse AS id, r.contenu AS "storedContent", r.prixpropose::text AS price,
              r.datereponse AS "sentAt", r.statusreponse AS status,
              u.idutilisateur AS "providerId", u.prenom AS "providerFirstName", u.nom AS "providerLastName"
         FROM reponse r
         LEFT JOIN utilisateur u ON u.idutilisateur = r.idutilisateur
        WHERE r.idgig = $1
        ORDER BY r.datereponse DESC NULLS LAST, r.idreponse DESC`,
      [id],
    )).rows
    : [];

  const proposals: ProposalDetail[] = proposalRows.map(({ storedContent, ...proposal }) => ({
    ...proposal,
    ...readProposalContent(storedContent),
  }));

  return { ...gig, isOwner, payments, proposals };
}

export async function createProposal(input: CreateProposalInput): Promise<'NOT_FOUND' | 'OWN_GIG' | 'ALREADY_EXISTS' | ProposalDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: gigs } = await client.query<{ ownerId: number | null; status: string | null }>(
      `SELECT idutilisateur AS "ownerId", statusgig AS status FROM gig WHERE idgig = $1 FOR UPDATE`,
      [input.gigId],
    );
    const gig = gigs[0];
    if (!gig || gig.status !== GIG_STATUS.VALIDATED) { await client.query('ROLLBACK'); return 'NOT_FOUND'; }
    if (gig.ownerId === input.providerId) { await client.query('ROLLBACK'); return 'OWN_GIG'; }

    const existing = await client.query(
      `SELECT 1 FROM reponse WHERE idgig = $1 AND idutilisateur = $2 AND statusreponse = 'EN_ATTENTE'`,
      [input.gigId, input.providerId],
    );
    if ((existing.rowCount ?? 0) > 0) { await client.query('ROLLBACK'); return 'ALREADY_EXISTS'; }

    const storedContent = `${input.content}${AVAILABILITY_SEPARATOR}${input.availability}`;
    const { rows } = await client.query<{ id: number; price: string; sentAt: Date | null; status: string | null }>(
      `INSERT INTO reponse (contenu, prixpropose, datereponse, statusreponse, idutilisateur, idgig)
       VALUES ($1, $2, NOW(), 'EN_ATTENTE', $3, $4)
       RETURNING idreponse AS id, contenu AS content, prixpropose::text AS price,
                 datereponse AS "sentAt", statusreponse AS status`,
      [storedContent, input.price, input.providerId, input.gigId],
    );
    await client.query('COMMIT');
    return {
      ...rows[0],
      content: input.content,
      availability: input.availability,
      providerId: null,
      providerFirstName: null,
      providerLastName: null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
