import { NextFunction, Request, Response } from 'express';
import { reportConversationContent } from '../services/message-report.service';
import { AppError } from '../utils/AppError';

export async function createMessageReport(req: Request, res: Response, next: NextFunction) {
  try {
    const conversationId = Number(req.params.id);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!Number.isInteger(conversationId) || conversationId <= 0) throw new AppError(400, 'Identifiant de conversation invalide.');
    if (reason.length < 5 || reason.length > 2000) throw new AppError(400, 'Le motif doit contenir entre 5 et 2 000 caractères.');
    const report = await reportConversationContent(conversationId, req.user!.id, reason);
    res.status(201).json({ report });
  } catch (error: any) {
    if (error.message === 'Conversation introuvable.') next(new AppError(404, error.message));
    else next(error);
  }
}
