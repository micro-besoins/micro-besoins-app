export type PaymentProviderKey = 'mcb' | 'juice' | 'paypal';
export type PaymentProviderStatus = 'disabled' | 'ready';

export interface PaymentProvider {
  key: PaymentProviderKey;
  label: string;
  status: PaymentProviderStatus;
}
