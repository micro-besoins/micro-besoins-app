import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    console.error('[health] Connexion à la base impossible :', err);
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

export default router;