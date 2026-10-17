import { Request, Response } from 'express';
import * as signalementsService from '../services/signalements.service';
import { REPORT_STATUS, REPORT_STATUSES } from '../utils/constants';
import { parseId, parsePagination, parseStatus } from '../utils/pagination';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query);
  const status = parseStatus(req.query.status, REPORT_STATUSES, REPORT_STATUS.OPEN);
  res.json(await signalementsService.listReports(status, page, limit));
}

export async function process(req: Request, res: Response): Promise<void> {
  res.json(await signalementsService.processReport(parseId(req.params.id)));
}