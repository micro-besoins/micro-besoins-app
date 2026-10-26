export const ROLES = {
  ADMIN: 'ADMIN',
} as const;

export const GIG_STATUS = {
  PENDING: 'EN_ATTENTE',
  VALIDATED: 'VALIDE',
  REFUSED: 'REFUSE',
  TERMINE: 'TERMINE',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'EN_ATTENTE',
  SUCCESS: 'REUSSI',
  FAILED: 'ECHOUE',
} as const;

export const REPORT_STATUS = {
  OPEN: 'OUVERT',
  IN_PROGRESS: 'EN_COURS',
  PROCESSED: 'TRAITE',
} as const;

export const GIG_STATUSES: readonly string[] = Object.values(GIG_STATUS);
export const PAYMENT_STATUSES: readonly string[] = Object.values(PAYMENT_STATUS);
export const REPORT_STATUSES: readonly string[] = Object.values(REPORT_STATUS);