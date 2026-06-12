import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

WebBrowser.maybeCompleteAuthSession();

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  userId: number;
  email: string;
  fullName: string;
};

export type SignupResponse = {
  message: string;
  email: string;
  requiresVerification: boolean;
};

export type EmailActionResponse = {
  message: string;
  email: string;
};

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string, fullName: string): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>('/auth/signup', { email, password, fullName });
    return data;
  },

  async verifyEmail(email: string, code: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/verify-email', { email, code });
    return data;
  },

  async resendVerification(email: string): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>('/auth/resend-verification', { email });
    return data;
  },

  async requestPasswordReset(email: string): Promise<EmailActionResponse> {
    const { data } = await api.post<EmailActionResponse>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<EmailActionResponse> {
    const { data } = await api.post<EmailActionResponse>('/auth/reset-password', { email, code, newPassword });
    return data;
  },

  async loginWithGoogle(): Promise<LoginResponse> {
    const redirectUri = Linking.createURL('auth/callback');
    const baseUrl = String(api.defaults.baseURL ?? '').replace(/\/$/, '');
    const startUrl = `${baseUrl}/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled.');
    }

    const parsed = Linking.parse(result.url);
    const params = parsed.queryParams ?? {};
    const error = typeof params.error === 'string' ? params.error : null;
    if (error) {
      throw new Error(error);
    }

    const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
    const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
    const userIdValue = typeof params.userId === 'string' ? params.userId : Array.isArray(params.userId) ? params.userId[0] : null;
    const email = typeof params.email === 'string' ? params.email : null;
    const fullName = typeof params.fullName === 'string' ? params.fullName : null;

    if (!accessToken || !refreshToken || !userIdValue || !email || !fullName) {
      throw new Error('Google sign-in did not complete correctly.');
    }

    const userId = Number(userIdValue);
    if (Number.isNaN(userId)) {
      throw new Error('Google sign-in returned an invalid user.');
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      userId,
      email,
      fullName,
    };
  },

  async updateProfile(fullName: string, phone?: string): Promise<void> {
    await api.put('/auth/profile', { fullName, phone });
  },
};
