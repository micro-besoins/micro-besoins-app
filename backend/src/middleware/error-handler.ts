import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/app-error';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }

  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Le corps de la requête n\'est pas un JSON valide.' });
    return;
  }

  console.error('[error] Erreur non gérée :', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' });
};