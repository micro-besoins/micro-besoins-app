import { NextFunction, Request, Response } from 'express';
import { assertProviderReady, listPaymentProviders } from '../services/payment.service';
import { AppError } from '../utils/AppError';

export function paymentProviders(_req: Request, res: Response) {
  res.json({ providers: listPaymentProviders() });
}

// Point d'extension pour les futures intégrations MCB, Juice et PayPal.
// Aucun appel externe ni débit n'est effectué tant qu'un prestataire est désactivé.
export function startPayment(req: Request, _res: Response, next: NextFunction) {
  try {
    const provider = assertProviderReady(req.body?.provider);
    throw new AppError(501, `L’intégration ${provider} n’est pas encore configurée.`);
  } catch (error) {
    next(error);
  }
}
