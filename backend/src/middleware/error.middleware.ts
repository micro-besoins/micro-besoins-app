import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  // JSON mal formé dans le corps de la requête
  if (err instanceof SyntaxError && (err as any).status === 400) {
    return res.status(400).json({ message: 'Corps de requête JSON invalide.' });
  }

  console.error(err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}
