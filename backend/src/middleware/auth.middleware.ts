import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload, Role } from '../types/auth';
import { AppError } from '../utils/AppError';

// Vérifie le token JWT (en-tête "Authorization: Bearer <token>")
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentification requise.'));
  }

  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as unknown as AuthPayload;
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Token invalide ou expiré.'));
  }
}

// Restreint une route à certains rôles, à placer après authenticate
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Accès refusé.'));
    }
    next();
  };
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwtSecret) as unknown as AuthPayload;
      req.user = { id: payload.id, role: payload.role };
    } catch { /* token invalide : on continue en visiteur */ }
  }
  next();
}
