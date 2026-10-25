import { pool } from '../config/db';
import { GIG_STATUS, PAYMENT_STATUS } from '../utils/constants';

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

function gigSelect(capabilities: GigCapabilities, viewerParam = 'NULL'): string {
  const category = capabilities.hasCategory ? 'g.categorie' : 'NULL::text';
  const location = capabilities.hasLocation ? 'g.localite' : 'NULL::text';
  const requestedDate = capabilities.hasRequestedDate ? 'g.dateSouhaitee' : 'NULL::timestamp';
  return `SELECT g.idgig AS id, g.titre AS title, g.description, g.budget::text AS budget,
            g.datepublication AS "publishedAt", g.statusgig AS status,
            ${category} AS category, ${location} AS location, ${requestedDate} AS "requestedAt",
            u.idutilisateur AS "ownerId", u.nom AS "ownerLastName", u.prenom AS "ownerFirstName",
            COUNT(r.idreponse)::int AS "proposalCount",
            EXISTS (SELECT 1 FROM reponse mine WHERE mine.idgig = g.idgig AND mine.idutilisateur = ${viewerParam}) AS "hasProposed"
     FROM gig g
     LEFT JOIN utilisateur u ON u.idutilisateur = g.idutilisateur
     LEFT JOIN reponse r ON r.idgig = g.idgig`;
}

export async function findGigs(filters: GigFilters, viewerId: number) {
  const capabilities = await getCapabilities();
  const values: string[] = [String(viewerId)];
  const conditions: string[] = [`(g.statusgig = 'VALIDE' OR (g.idutilisateur = $1 AND g.statusgig = 'EN_COURS'))`];
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
    `${gigSelect(capabilities, '$1')}
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
    `${gigSelect(capabilities, '$2')}
     WHERE g.idgig = $1
     GROUP BY g.idgig, u.idutilisateur`,
    [id, viewerId]
  );
  const gig = rows[0];
  if (!gig) return null;
 
  const isOwner = viewerId !== null && gig.ownerId === viewerId;
  if (gig.status !== GIG_STATUS.VALIDATED && !isOwner) return null;
 
  return { ...gig, isOwner };
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
