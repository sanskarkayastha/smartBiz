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

export const leadsService = {
  async getLeads(): Promise<Lead[]> {
    const { data } = await api.get<Lead[]>('/leads');
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
