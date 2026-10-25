import { NextFunction, Request, Response } from 'express';
import { createProposal, findMyProposals } from '../services/proposal.service';
import { AppError } from '../utils/AppError';

export async function submitProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const gigId = Number(req.params.id);
    if (!Number.isSafeInteger(gigId) || gigId <= 0) throw new AppError(400, 'Identifiant de besoin invalide.');
    const { message, price, availability } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim() || typeof availability !== 'string' || !availability.trim()) {
      throw new AppError(400, 'Le message et les disponibilités sont obligatoires.');
    }
    if (message.trim().length > 5000 || availability.trim().length > 500) {
      throw new AppError(400, 'Le message est limité à 5 000 caractères et les disponibilités à 500 caractères.');
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 99999.99
      || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
      throw new AppError(400, 'Le tarif doit être compris entre Rs 0,01 et Rs 99 999,99, avec deux décimales maximum.');
    }
    const proposal = await createProposal(gigId, req.user!.id, { message: message.trim(), price, availability: availability.trim() });
    res.status(201).json({ proposal, message: 'Votre proposition a bien été envoyée.' });
  } catch (error) { next(error); }
}

export async function listMyProposals(req: Request, res: Response, next: NextFunction) {
  try { res.json({ proposals: await findMyProposals(req.user!.id) }); }
  catch (error) { next(error); }
}
