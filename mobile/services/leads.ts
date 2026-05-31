import { api } from './api';
import { Customer } from './customers';

export type LeadStage = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'PROPOSAL' | 'WON' | 'LOST';
export type LeadSource = 'WALK_IN' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'PHONE_CALL' | 'ONLINE' | 'OTHER';

export type Lead = {
  id: number;
  userId: number;
  name: string;
  phone: string | null;
  email: string | null;
  stage: LeadStage;
  source: LeadSource | null;
  estimatedValue: number | null;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PagedResponse<T> = {
  content: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
};

export type CreateLeadPayload = {
  name: string;
  phone?: string;
  email?: string;
  stage?: LeadStage;
  source?: LeadSource;
  estimatedValue?: number;
  notes?: string;
  followUpDate?: string;
};

export type LeadFilters = {
  search?: string;
  stage?: string;
  source?: string;
  overdueOnly?: boolean;
};

export const leadsService = {
  async getLeads(page = 0, size = 20, filters?: LeadFilters): Promise<PagedResponse<Lead>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (filters?.search) params.search = filters.search;
    if (filters?.stage) params.stage = filters.stage;
    if (filters?.source) params.source = filters.source;
    if (filters?.overdueOnly) params.overdueOnly = true;
    const { data } = await api.get<PagedResponse<Lead>>('/leads', { params });
    return data;
  },

  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    const { data } = await api.post<Lead>('/leads', payload);
    return data;
  },

  async updateLead(id: number, payload: Partial<CreateLeadPayload>): Promise<Lead> {
    const { data } = await api.put<Lead>(`/leads/${id}`, payload);
    return data;
  },

  async deleteLead(id: number): Promise<void> {
    await api.delete(`/leads/${id}`);
  },

  async convertToCustomer(id: number): Promise<Customer> {
    const { data } = await api.post<Customer>(`/leads/${id}/convert`);
    return data;
  },
};
