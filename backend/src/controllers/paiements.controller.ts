import { Request, Response } from 'express';
import * as paiementsService from '../services/paiements.service';
import { PAYMENT_STATUSES } from '../utils/constants';
import { parsePagination, parseStatus } from '../utils/pagination';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query);
  const status = req.query.status === undefined || req.query.status === ''
    ? undefined
    : parseStatus(req.query.status, PAYMENT_STATUSES, 'ECHOUE');
  res.json(await paiementsService.listPayments(status, page, limit));
}
