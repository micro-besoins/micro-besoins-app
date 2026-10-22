import { Request, Response } from 'express';
import * as statsService from '../services/stats.service';

export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(await statsService.getDashboardStats());
}

export async function getPublicationsToValidateCount(_req: Request, res: Response): Promise<void> {
  res.json({ count: await statsService.countPublicationsToValidate() });
}

export async function getFailedPaymentsCount(_req: Request, res: Response): Promise<void> {
  res.json({ count: await statsService.countFailedPayments() });
}

export async function getOpenReportsCount(_req: Request, res: Response): Promise<void> {
  res.json({ count: await statsService.countOpenReports() });
}