import { Pagination } from '../types/admin.types';
import { AppError } from './app-error';

const MAX_LIMIT = 100;
const MAX_INT4 = 2_147_483_647; // taille d'un INT PostgreSQL

function toPositiveInt(raw: unknown, name: string, fallback?: number): number {
  if ((raw === undefined || raw === '') && fallback !== undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_INT4) {
    throw new AppError(400, 'INVALID_PARAMETER', `Le paramètre « ${name} » doit être un entier positif.`);
  }
  return n;
}

/** Lit ?page= et ?limit= (défaut : page 1, 20 éléments, maximum 100). */
export function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  const page = toPositiveInt(query.page, 'page', 1);
  const limit = Math.min(toPositiveInt(query.limit, 'limit', 20), MAX_LIMIT);
  return { page, limit };
}

/** Lit un identifiant dans l'URL (ex. /publications/:id/accepter). */
export function parseId(raw: unknown): number {
  return toPositiveInt(raw, 'id');
}

/** Lit ?status= et vérifie qu'il fait partie des valeurs autorisées. */
export function parseStatus(raw: unknown, allowed: readonly string[], fallback: string): string {
  if (raw === undefined || raw === '') return fallback;
  const value = typeof raw === 'string' ? raw.toUpperCase() : '';
  if (!allowed.includes(value)) {
    throw new AppError(400, 'INVALID_PARAMETER', `Statut invalide. Valeurs possibles : ${allowed.join(', ')}.`);
  }
  return value;
}

export function buildPagination(total: number, page: number, limit: number): Pagination {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}