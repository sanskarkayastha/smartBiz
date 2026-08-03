import { api } from './api';

export type SaleItem = {
  productId: number;
  quantity: number;
  unitPrice?: number;
};

export type CreateSalePayload = {
  items: SaleItem[];
  paymentMethod?: string;
  customerId?: number | null;
  customerName?: string | null;
  saleDate?: string | null;
};

export type ImportSalesPayload = {
  sales: CreateSalePayload[];
};

export type SaleSummary = {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  totalDue: number;
};

export type DailyRevenue = {
  date: string;
  revenue: number;
};

export type Sale = {
  id: number;
  customerId: number | null;
  customerName: string | null;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  saleDate: string;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

export type EsewaMerchantSettings = {
  configured: boolean;
  maskedProductCode: string | null;
  environment: string;
  updatedAt: string | null;
};

export type PosPayment = {
  paymentId: string;
  saleId: number;
  amount: number;
  currency: string;
  status: 'BOOKED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REVIEW';
  qrPayload: string | null;
  deeplink: string | null;
  referenceCode: string | null;
  expiresAt: string;
  environment: 'UAT' | 'PRODUCTION';
};

export const salesService = {
  async createSale(
    items: SaleItem[],
    paymentMethod = 'CASH',
    customerId?: number,
    customerName?: string,
    saleDate?: string | null,
  ): Promise<Sale> {
    const { data } = await api.post<Sale>('/sales', { items, paymentMethod, customerId, customerName, saleDate });
    return data;
  },

  async importSales(payload: ImportSalesPayload): Promise<Sale[]> {
    const { data } = await api.post<Sale[]>('/sales/import', payload);
    return data;
  },

  async getSales(filters?: { date?: string; dateFrom?: string; dateTo?: string }): Promise<Sale[]> {
    const { data } = await api.get<Sale[]>('/sales', { params: filters });
    return data;
  },

  async getDailySummary(): Promise<SaleSummary> {
    const { data } = await api.get<SaleSummary>('/sales/analytics/today');
    return data;
  },

  async getWeeklySummary(): Promise<DailyRevenue[]> {
    const { data } = await api.get<DailyRevenue[]>('/sales/analytics/weekly');
    return data;
  },

  async getEsewaSettings(): Promise<EsewaMerchantSettings> {
    const { data } = await api.get<EsewaMerchantSettings>('/sales/payment-settings/esewa');
    return data;
  },

  async saveEsewaSettings(productCode: string, accessKey: string): Promise<EsewaMerchantSettings> {
    const { data } = await api.put<EsewaMerchantSettings>('/sales/payment-settings/esewa', { productCode, accessKey });
    return data;
  },

  async deleteEsewaSettings(): Promise<void> {
    await api.delete('/sales/payment-settings/esewa');
  },

  async createEsewaPayment(payload: CreateSalePayload): Promise<PosPayment> {
    const { data } = await api.post<PosPayment>('/sales/payments/esewa', payload);
    return data;
  },

  async getEsewaPayment(id: string): Promise<PosPayment> {
    const { data } = await api.get<PosPayment>(`/sales/payments/esewa/${id}`);
    return data;
  },

  async cancelEsewaPayment(id: string): Promise<PosPayment> {
    const { data } = await api.post<PosPayment>(`/sales/payments/esewa/${id}/cancel`);
    return data;
  },
};
