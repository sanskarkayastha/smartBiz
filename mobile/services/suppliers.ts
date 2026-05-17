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
};

export type SupplierProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  quantity: number;
};

export type CreateSupplierPayload = {
  name: string;
  phone?: string;
  email?: string;
  balanceOwed?: number;
  notes?: string;
};

export type UpdateSupplierPayload = {
  phone?: string;
  email?: string;
  balanceOwed?: number;
  notes?: string;
};

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    const { data } = await api.get<Supplier[]>('/inventory/suppliers');
    return data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/inventory/suppliers', payload);
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
};
