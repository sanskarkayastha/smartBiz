import { api } from './api';

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  balanceOwed: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type SupplierProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  quantity: number;
  reorderLevel: number | null;
  lowStock: boolean;
};

export type SupplierLedgerEntryType = 'OPENING_BALANCE' | 'PURCHASE' | 'PAYMENT' | 'MANUAL_ADJUSTMENT';
export type SupplierAdjustmentMode = 'ADD_DEBT' | 'SET_BALANCE';

export type SupplierLedgerEntry = {
  id: number;
  type: SupplierLedgerEntryType;
  amount: number;
  productId: number | null;
  quantity: number | null;
  unitCost: number | null;
  note: string | null;
  createdAt: string;
};

export type SupplierSummary = {
  totalSuppliers: number;
  suppliersWithBalance: number;
  totalBalanceOwed: number;
  linkedProducts: number;
  suppliersNeedingRestock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
};

export type PagedResponse<T> = {
  content: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
};

export type CreateSupplierPayload = {
  name: string;
  phone?: string;
  email?: string;
  openingBalance?: number;
  balanceOwed?: number;
  notes?: string;
};

export type UpdateSupplierPayload = {
  phone?: string;
  email?: string;
  balanceOwed?: number;
  notes?: string;
};

export type RecordSupplierPaymentPayload = {
  amount: number;
  note?: string;
};

export type AdjustSupplierBalancePayload = {
  mode: SupplierAdjustmentMode;
  amount?: number;
  targetBalance?: number;
  note?: string;
};

export type SupplierFilters = {
  search?: string;
  hasBalance?: boolean;
};

export const supplierService = {
  async getSuppliers(page = 0, size = 20, filters?: SupplierFilters): Promise<PagedResponse<Supplier>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (filters?.search) params.search = filters.search;
    if (filters?.hasBalance) params.hasBalance = true;
    const { data } = await api.get<PagedResponse<Supplier>>('/inventory/suppliers', { params });
    return data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/inventory/suppliers', payload);
    return data;
  },

  async getSupplierSummary(): Promise<SupplierSummary> {
    const { data } = await api.get<SupplierSummary>('/inventory/suppliers/summary');
    return data;
  },

  async updateSupplier(id: number, payload: UpdateSupplierPayload): Promise<Supplier> {
    const { data } = await api.put<Supplier>(`/inventory/suppliers/${id}`, payload);
    return data;
  },

  async getSupplierProducts(id: number): Promise<SupplierProduct[]> {
    const { data } = await api.get<SupplierProduct[]>(`/inventory/suppliers/${id}/products`);
    return data;
  },

  async getSupplierLedger(id: number): Promise<SupplierLedgerEntry[]> {
    const { data } = await api.get<SupplierLedgerEntry[]>(`/inventory/suppliers/${id}/ledger`);
    return data;
  },

  async recordSupplierPayment(id: number, payload: RecordSupplierPaymentPayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>(`/inventory/suppliers/${id}/payments`, payload);
    return data;
  },

  async adjustSupplierBalance(id: number, payload: AdjustSupplierBalancePayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>(`/inventory/suppliers/${id}/adjustments`, payload);
    return data;
  },
};
