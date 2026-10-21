import { QueryResult, QueryResultRow } from 'pg';
import { AppError } from '../utils/app-error';
import { pool } from './pool';

const CONNECTION_ERRORS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '57P03']);

function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: string }).code ?? '';
  return CONNECTION_ERRORS.has(code) || code.startsWith('08');
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[],
  failureMessage: string,
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (err) {
    console.error(`[db] ${failureMessage}`, err);
    if (isConnectionError(err)) {
      throw new AppError(503, 'DATABASE_UNAVAILABLE', 'La base de données est momentanément indisponible.');
    }
    throw new AppError(500, 'DATABASE_ERROR', failureMessage);
  }
}