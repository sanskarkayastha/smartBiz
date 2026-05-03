import { api } from './api';

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  userId: number;
  email: string;
  fullName: string;
};

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string, fullName: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/signup', { email, password, fullName });
    return data;
  },

  async updateProfile(fullName: string, phone?: string): Promise<void> {
    await api.put('/auth/profile', { fullName, phone });
  },
};
