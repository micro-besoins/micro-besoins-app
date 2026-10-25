import { NextFunction, Request, Response } from 'express';
import { categoryExists, createGig, findGigs, findGigById, getGigFilterOptions, reportGig } from '../services/gig.service';
import { AppError } from '../utils/AppError';
import { accepterProposition as accepterPropositionService, terminerProposition as terminerPropositionService } from '../services/gig.service';
import { createProposition, findGigsByOwner } from '../services/gig.service';
import { getOrCreateConversation } from '../services/conversation.service';
import { findGigProposals } from '../services/profile.service';

const queryValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function listGigs(req: Request, res: Response, next: NextFunction) {
  try {
    const gigs = await findGigs({
      keyword: queryValue(req.query['q']) || undefined,
      category: queryValue(req.query['category']) || undefined,
      location: queryValue(req.query['location']) || undefined,
      budget: queryValue(req.query['budget']) || undefined,
    });
    res.json({ gigs });
  } catch (error) {
    next(error);
  }
}

export async function gigFilterOptions(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getGigFilterOptions());
  } catch (error) {
    next(error);
  }
}

export async function getGig(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 'INVALID_PARAMETER', message: 'Identifiant de besoin invalide.' });
      return;
    }
 
    const gig = await findGigById(id, req.user?.id ?? null);
    if (!gig) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Besoin introuvable.' });
      return;
    }
 
    res.json({ gig, proposals: gig.isOwner ? await findGigProposals(id) : [] });
  } catch (error) {
    next(error);
  }
}

export async function createGigReport(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 'INVALID_PARAMETER', message: 'Identifiant de besoin invalide.' });
      return;
    }
    if (reason.length < 5 || reason.length > 2000) {
      res.status(400).json({ code: 'INVALID_REPORT', message: 'Le motif doit contenir entre 5 et 2 000 caractères.' });
      return;
    }
    const report = await reportGig(id, req.user!.id, reason);
    if (!report) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Cette annonce ne peut pas être signalée.' });
      return;
    }
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
}

export async function listMyGigs(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ gigs: await findGigsByOwner(req.user!.id) });
  } catch (error) {
    next(error);
  }
}

export async function accepterProposition(req: Request, res: Response, next: NextFunction) {
  try {
    const idReponse = Number(req.params.id);
    const ownerId = req.user!.id;
    const { dateRdv } = req.body;
    if (isNaN(idReponse)) {
      throw new AppError(400, 'ID de proposition invalide.');
    }
    const result = await accepterPropositionService(idReponse, ownerId, dateRdv || null);
    res.json({ message: 'Proposition acceptée avec succès.', data: result });
  } catch (error: any) {
  if (error.message === "Proposition introuvable." || error.message === "Vous n'êtes pas le propriétaire de cette annonce.") {
    next(new AppError(403, error.message));
  } else if (error.message === 'Cette proposition a déjà été traitée.') {
    next(new AppError(409, error.message));
  } else {
    next(error);
  }
}
}

export async function terminerProposition(req: Request, res: Response, next: NextFunction) {
  try {
    const idReponse = Number(req.params.id);
    if (!Number.isInteger(idReponse) || idReponse <= 0) throw new AppError(400, 'ID de proposition invalide.');
    const result = await terminerPropositionService(idReponse, req.user!.id);
    res.json({ message: 'Service marqué comme terminé et paiement enregistré.', data: result });
  } catch (error: any) {
    if (error.message === 'Proposition introuvable.' || error.message === 'Vous n’êtes pas le propriétaire de cette annonce.') {
      next(new AppError(403, error.message));
    } else if (error.message === 'Seule une proposition acceptée peut être terminée.') {
      next(new AppError(409, error.message));
    } else {
      next(error);
    }
  }
}

export async function publishGig(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, category, location, budget, requestedAt } = req.body ?? {};
    const textFields = { title, description, category, location, requestedAt };
    if (Object.values(textFields).some((value) => typeof value !== 'string' || !value.trim())) {
      throw new AppError(400, 'Tous les champs sont requis.');
    }
    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      throw new AppError(400, 'Le budget doit être supérieur à zéro.');
    }
    if (title.trim().length > 50) throw new AppError(400, 'Le titre ne doit pas dépasser 50 caractères.');
    if (!await categoryExists(category.trim())) {
      throw new AppError(400, 'La catégorie sélectionnée est invalide.');
    }
    const requestedDate = new Date(requestedAt);
    if (Number.isNaN(requestedDate.getTime())) throw new AppError(400, 'La date souhaitée est invalide.');
    const gig = await createGig({
      title: title.trim(), description: description.trim(), category: category.trim(), location: location.trim(),
      budget: numericBudget, requestedAt: requestedDate.toISOString(), ownerId: req.user!.id,
    });
    res.status(201).json({ gig });
  } catch (error) {
    next(error);
  }
}

export async function createPropositionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const gigId = Number(req.params.id);
    const { message, montant } = req.body;
    const userId = req.user!.id;

    if (!message || !montant || montant <= 0) {
      throw new AppError(400, 'Message et montant valides requis.');
    }

    if (!Number.isInteger(gigId) || gigId <= 0) throw new AppError(400, 'Identifiant de besoin invalide.');
    const content = typeof message === 'string' ? message.trim() : '';
    const amount = Number(montant);
    if (content.length < 10 || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, 'Message et montant valides requis.');
    }

    const proposition = await createProposition(gigId, userId, content, amount);
    const conversation = await getOrCreateConversation(gigId, userId);
    res.status(201).json({ proposition, conversation });
  } catch (error: any) {
    const knownErrors = [
      'Besoin introuvable.',
      'Vous ne pouvez pas proposer vos services sur votre propre besoin.',
      'Ce besoin n’est pas disponible pour les propositions.',
      'Vous avez déjà envoyé une proposition pour ce besoin.',
    ];
    if (knownErrors.includes(error.message)) {
      next(new AppError(error.message === 'Besoin introuvable.' ? 404 : 409, error.message));
    } else {
      next(error);
    }
  }
}
