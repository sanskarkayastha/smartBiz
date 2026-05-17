import { api } from './api';

export type SaleItem = {
  productId: number;
  quantity: number;
  unitPrice?: number;
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
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

export const salesService = {
  async createSale(
    items: SaleItem[],
    paymentMethod = 'CASH',
    customerId?: number,
    customerName?: string,
  ): Promise<Sale> {
    const { data } = await api.post<Sale>('/sales', { items, paymentMethod, customerId, customerName });
    return data;
  },

  async getSales(): Promise<Sale[]> {
    const { data } = await api.get<Sale[]>('/sales');
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
};
