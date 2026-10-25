import { NextFunction, Request, Response } from 'express';
import { categoryExists, createGig, findGigs, findGigById, getGigFilterOptions } from '../services/gig.service';
import { AppError } from '../utils/AppError';

const queryValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function listGigs(req: Request, res: Response, next: NextFunction) {
  try {
    const gigs = await findGigs({
      keyword: queryValue(req.query['q']) || undefined,
      category: queryValue(req.query['category']) || undefined,
      location: queryValue(req.query['location']) || undefined,
      budget: queryValue(req.query['budget']) || undefined,
    }, req.user!.id);
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
 
    res.json({ gig });
  } catch (error) {
    next(error);
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
