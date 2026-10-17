import { Request, Response } from 'express';
import * as publicationsService from '../services/publications.service';
import { AppError } from '../utils/app-error';
import { GIG_STATUS, GIG_STATUSES } from '../utils/constants';
import { parseId, parsePagination, parseStatus } from '../utils/pagination';

const MAX_MOTIF_LENGTH = 1000;

/** Motif de refus facultatif : absent ou vide => null. */
function parseMotif(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw new AppError(400, 'INVALID_PARAMETER', 'Le motif doit être un texte.');
  }
  const motif = raw.trim();
  if (motif === '') return null;
  if (motif.length > MAX_MOTIF_LENGTH) {
    throw new AppError(400, 'INVALID_PARAMETER', `Le motif ne doit pas dépasser ${MAX_MOTIF_LENGTH} caractères.`);
  }
  return motif;
}

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query);
  const status = parseStatus(req.query.status, GIG_STATUSES, GIG_STATUS.PENDING);
  res.json(await publicationsService.listPublications(status, page, limit));
}

export async function accept(req: Request, res: Response): Promise<void> {
  res.json(await publicationsService.decidePublication(parseId(req.params.id), 'accept'));
}

export async function refuse(req: Request, res: Response): Promise<void> {
  const motif = parseMotif(req.body?.motif);
  res.json(await publicationsService.decidePublication(parseId(req.params.id), 'refuse', motif));
}