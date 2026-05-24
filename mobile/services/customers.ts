import { api } from './api';

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  dueAmount: number;
  lastPurchaseDate: string | null;
};

export type PagedResponse<T> = {
  content: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
};

export type CreateCustomerPayload = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export const customersService = {
  async getCustomers(page = 0, size = 20): Promise<PagedResponse<Customer>> {
    const { data } = await api.get<PagedResponse<Customer>>('/customers', {
      params: { page, size },
    });
    return data;
  },

  async getCustomersWithDue(): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>('/customers/with-due');
    return data;
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const { data } = await api.post<Customer>('/customers', payload);
    return data;
  },

  async updateCustomer(id: number, payload: Partial<CreateCustomerPayload>): Promise<Customer> {
    const { data } = await api.put<Customer>(`/customers/${id}`, payload);
    return data;
  },

  async deleteCustomer(id: number): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
