import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService, type EmailActionResponse, type LoginResponse, type SignupResponse } from '@/services/auth';

type AuthUser = {
  token: string;
  userId: number;
  email: string;
  fullName: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<SignupResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<SignupResponse>;
  requestPasswordReset: (email: string) => Promise<EmailActionResponse>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<EmailActionResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<Pick<AuthUser, 'fullName'>>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const stored = await SecureStore.getItemAsync('userInfo');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore corrupt storage
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSession(data: LoginResponse) {
    const authUser: AuthUser = {
      token: data.access_token,
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
    };
    await SecureStore.setItemAsync('token', data.access_token);
    await SecureStore.setItemAsync('userId', String(data.userId));
    await SecureStore.setItemAsync('userInfo', JSON.stringify(authUser));
    setUser(authUser);
  }

  async function login(email: string, password: string) {
    const data = await authService.login(email, password);
    await saveSession(data);
  }

  async function register(email: string, password: string, fullName: string) {
    return authService.register(email, password, fullName);
  }

  async function verifyEmail(email: string, code: string) {
    const data = await authService.verifyEmail(email, code);
    await saveSession(data);
  }

  async function resendVerification(email: string) {
    return authService.resendVerification(email);
  }

  async function requestPasswordReset(email: string) {
    return authService.requestPasswordReset(email);
  }

  async function resetPassword(email: string, code: string, newPassword: string) {
    return authService.resetPassword(email, code, newPassword);
  }

  async function loginWithGoogle() {
    const data = await authService.loginWithGoogle();
    await saveSession(data);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userInfo');
    setUser(null);
  }

  async function updateUser(updates: Partial<Pick<AuthUser, 'fullName'>>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    await SecureStore.setItemAsync('userInfo', JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, verifyEmail, resendVerification, requestPasswordReset, resetPassword, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
