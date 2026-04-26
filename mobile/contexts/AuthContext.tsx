import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '@/services/auth';

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
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
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

  async function saveSession(data: ReturnType<typeof authService.login> extends Promise<infer T> ? T : never) {
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
    const data = await authService.register(email, password, fullName);
    await saveSession(data);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userInfo');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
