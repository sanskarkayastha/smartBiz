import { api } from './api';

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  lastPurchaseDate: string | null;
};

export type CreateCustomerPayload = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export const customersService = {
  async getCustomers(): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>('/customers');
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
