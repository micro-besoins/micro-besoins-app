import { env } from '../config/env';
import { PaymentProvider, PaymentProviderKey } from '../types/payment';
import { AppError } from '../utils/AppError';

const providers: Array<Omit<PaymentProvider, 'status'> & { enabled: boolean }> = [
  { key: 'mcb', label: 'MCB Payment Gateway', enabled: env.mcbEnabled },
  { key: 'juice', label: 'MCB Juice', enabled: env.juiceEnabled },
  { key: 'paypal', label: 'PayPal', enabled: env.paypalEnabled },
];

export function listPaymentProviders(): PaymentProvider[] {
  return providers.map(({ key, label, enabled }) => ({ key, label, status: enabled ? 'ready' : 'disabled' }));
}

export function assertProviderReady(provider: string): PaymentProviderKey {
  const match = providers.find((item) => item.key === provider);
  if (!match) throw new AppError(400, 'Prestataire de paiement inconnu.');
  if (!match.enabled) throw new AppError(409, 'Ce moyen de paiement n’est pas encore activé.');
  return match.key;
}
