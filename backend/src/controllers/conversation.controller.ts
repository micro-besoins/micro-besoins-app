import { NextFunction, Request, Response } from 'express';
import { getConversationMessages, getOrCreateConversation, listConversations, sendMessage } from '../services/conversation.service';
import { AppError } from '../utils/AppError';

function id(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(400, 'Identifiant invalide.');
  return parsed;
}

export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try { res.json({ conversations: await listConversations(req.user!.id) }); } catch (error) { next(error); }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const gigId = id(String(req.body?.gigId ?? ''));
    const conversation = await getOrCreateConversation(gigId, req.user!.id);
    if (conversation.created || conversation.isEmpty) {
      await sendMessage(conversation.id, req.user!.id, `Bonjour, je vous contacte au sujet de « ${conversation.title} ».`);
    }
    res.status(conversation.created ? 201 : 200).json({ conversation });
  } catch (error: any) {
    if (error.message === 'Besoin introuvable.') next(new AppError(404, error.message));
    else if (error.message === 'Vous ne pouvez pas démarrer une conversation avec vous-même.') next(new AppError(403, error.message));
    else next(error);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try { res.json(await getConversationMessages(id(String(req.params.id)), req.user!.id)); }
  catch (error: any) { next(new AppError(error.message === 'Conversation introuvable.' ? 404 : 500, error.message)); }
}

export async function postMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (content.length < 1 || content.length > 2000) throw new AppError(400, 'Le message doit contenir entre 1 et 2 000 caractères.');
    const message = await sendMessage(id(String(req.params.id)), req.user!.id, content);
    res.status(201).json({ message });
  } catch (error: any) {
    next(new AppError(error.message === 'Conversation introuvable.' ? 404 : error.status ?? 500, error.message));
  }
}
