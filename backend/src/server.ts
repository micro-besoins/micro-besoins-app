import app from './app';
import { env } from './config/env';
import { pool } from './db/pool';

async function start(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('[OK] Connecté à la base de données PostgreSQL');
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`[ERREUR] Connexion à la base impossible : ${e.code ?? ''} ${e.message ?? ''}`.trim());
    console.error('         Vérifiez DATABASE_URL dans backend/.env');
  }

  const server = app.listen(env.port, () => {
    console.log(`API démarrée sur http://localhost:${env.port}`);
  });

  const shutdown = (): void => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void start();
