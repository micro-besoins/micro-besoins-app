import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { query } from '../db/query';
import { AppError } from '../utils/app-error';
import { ROLES } from '../utils/constants';

/**
 * Réserve une route aux administrateurs.
 *  1. Lit le token "Authorization: Bearer <jwt>".
 *  2. Vérifie sa signature et son expiration (401 sinon).
 *  3. Relit le rôle de l'utilisateur en base, pour ne pas faire confiance à un token ancien (403 si pas ADMIN).
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentification requise.');
  }

  let userId: number;
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret);
    userId = typeof payload === 'string' ? NaN : Number(payload.sub);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Token invalide ou expiré.');
  }
  if (!Number.isInteger(userId)) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token invalide ou expiré.');
  }

  const { rows } = await query<{ role: string | null }>(
    'SELECT roleutilisateur AS role FROM utilisateur WHERE idutilisateur = $1',
    [userId],
    'Impossible de vérifier les droits d\'accès.',
  );
  if (!rows[0]) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token invalide ou expiré.');
  }
  if (rows[0].role !== ROLES.ADMIN) {
    throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
  }

  req.user = { id: userId, role: rows[0].role };
  next();
}