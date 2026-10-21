import { query } from '../db/query';
import { DashboardStats } from '../types/admin.types';
import { GIG_STATUS, PAYMENT_STATUS, REPORT_STATUS } from '../utils/constants';

async function count(sql: string, param: string, failureMessage: string): Promise<number> {
  const { rows } = await query<{ count: number }>(sql, [param], failureMessage);
  return rows[0].count;
}

export function countPublicationsToValidate(): Promise<number> {
  return count(
    'SELECT COUNT(*)::int AS count FROM gig WHERE statusgig = $1',
    GIG_STATUS.PENDING,
    'Impossible de récupérer le nombre de publications à valider.',
  );
}

export function countFailedPayments(): Promise<number> {
  return count(
    'SELECT COUNT(*)::int AS count FROM paiement WHERE statuspaiement = $1',
    PAYMENT_STATUS.FAILED,
    'Impossible de récupérer le nombre de paiements échoués.',
  );
}

export function countOpenReports(): Promise<number> {
  return count(
    'SELECT COUNT(*)::int AS count FROM signalement WHERE statussignalement = $1',
    REPORT_STATUS.OPEN,
    'Impossible de récupérer le nombre de signalements ouverts.',
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [publicationsAValider, paiementsEchoues, signalementsOuverts] = await Promise.all([
    countPublicationsToValidate(),
    countFailedPayments(),
    countOpenReports(),
  ]);
  return { publicationsAValider, paiementsEchoues, signalementsOuverts };
}