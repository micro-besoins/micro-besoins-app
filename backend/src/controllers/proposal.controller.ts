import { NextFunction, Request, Response } from 'express';
import { decideProposal, listProposals, publicProfile, submitProposal } from '../services/proposal.service';
import { AppError } from '../utils/AppError';

function id(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new AppError(400, 'Identifiant invalide.');
  return Number(value);
}

export async function getProposals(req: Request, res: Response, next: NextFunction) {
  try { res.json({ proposals: await listProposals(id(req.params.id), req.user!.id) }); }
  catch (error) { next(error); }
}

export async function decision(req: Request, res: Response, next: NextFunction) {
  try {
    if (!['accept', 'refuse'].includes(req.body?.decision)) throw new AppError(400, 'Décision invalide.');
    res.json(await decideProposal(id(req.params.id), id(req.params.proposalId), req.user!.id, req.body.decision));
  } catch (error) { next(error); }
}

export async function createProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, availability, message } = req.body ?? {};
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 99999.99 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.00001) throw new AppError(400, 'Le montant doit être compris entre Rs 0,01 et Rs 99 999,99, avec deux décimales maximum.');
    if (typeof availability !== 'string' || !availability.trim() || availability.length > 500) throw new AppError(400, 'Indiquez votre disponibilité (500 caractères maximum).');
    if (typeof message !== 'string' || !message.trim() || message.length > 5000) throw new AppError(400, 'Indiquez votre message (5 000 caractères maximum).');
    await submitProposal(id(req.params.id), req.user!.id, amount, availability.trim(), message.trim());
    res.status(201).json({ message: 'Proposition envoyée.' });
  } catch (error) { next(error); }
}

export async function getPublicProfile(req: Request, res: Response, next: NextFunction) {
  try { res.json({ profile: await publicProfile(id(req.params.providerId)) }); }
  catch (error) { next(error); }
}
