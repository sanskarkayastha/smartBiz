import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

export type PlanCode = 'FREE' | 'PRO';
export type BillingTerm = 'MONTHLY' | 'YEARLY';
export type PaymentProvider = 'ESEWA' | 'STRIPE';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED';

export type PlanStatus = {
  effectivePlan: PlanCode;
  source: 'FREE' | 'TRIAL' | 'PURCHASED';
  validUntil: string | null;
  trialEndsAt: string | null;
  paidUntil: string | null;
  limits: Record<string, number>;
  usage: Record<string, number>;
  usageAvailable: boolean;
  usageAvailability: Record<string, boolean>;
};

export type BillingPayment = {
  id: string;
  provider: PaymentProvider;
  term: BillingTerm;
  amount: number;
  currency: string;
  status: PaymentStatus;
  completedAt: string | null;
  expiresAt: string;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const billingService = {
  async getStatus(): Promise<PlanStatus> {
    const { data } = await api.get<PlanStatus>('/billing/me');
    return data;
  },

  async startCheckout(provider: PaymentProvider, term: BillingTerm): Promise<BillingPayment> {
    const { data } = await api.post('/billing/checkouts', { provider, term, surface: 'MOBILE' });
    const redirectUri = Linking.createURL('billing/result');
    await WebBrowser.openAuthSessionAsync(data.action.url, redirectUri);

    let payment = await billingService.getPayment(data.paymentId);
    for (let attempt = 0; attempt < 12 && payment.status === 'PENDING'; attempt += 1) {
      await wait(2500);
      payment = await billingService.getPayment(data.paymentId);
    }
    return payment;
  },

  async getPayment(id: string): Promise<BillingPayment> {
    const { data } = await api.get<BillingPayment>(`/billing/payments/${id}`);
    return data;
  },
};
