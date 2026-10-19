import { Request, Response } from 'express';
import * as besoinsService from '../services/besoins.service';
import { parsePagination } from '../utils/pagination';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query);
  res.json(await besoinsService.listApprovedNeeds(page, limit));
}