import { Request, Response } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ code: 'ROUTE_NOT_FOUND', message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}