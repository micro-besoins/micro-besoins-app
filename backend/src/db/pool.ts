import { Pool, types } from 'pg';
import { env } from '../config/env';

types.setTypeParser(1700, (value) => parseFloat(value));

export const pool = new Pool({ connectionString: env.databaseUrl });

pool.on('error', (err) => {
  console.error('[db] Erreur PostgreSQL inattendue :', err.message);
});