import { Request, Response } from 'express';
import * as paiementsService from '../services/paiements.service';
import { PAYMENT_STATUS, PAYMENT_STATUSES } from '../utils/constants';
import { parsePagination, parseStatus } from '../utils/pagination';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query);
  const status = parseStatus(req.query.status, PAYMENT_STATUSES, PAYMENT_STATUS.FAILED);
  res.json(await paiementsService.listPayments(status, page, limit));
}