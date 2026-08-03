import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.247.23.13:8080';
console.log('API URL:', API_URL);

export const api = axios.create({ baseURL: API_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  try {
    const [token, userId] = await Promise.all([
      SecureStore.getItemAsync('token'),
      SecureStore.getItemAsync('userId'),
    ]);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (userId) config.headers['X-User-Id'] = userId;
  } catch {
    // If secure storage is temporarily unavailable, continue without auth headers.
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      void Promise.allSettled([
        SecureStore.deleteItemAsync('token'),
        SecureStore.deleteItemAsync('userId'),
        SecureStore.deleteItemAsync('userInfo'),
      ]);
    }
    return Promise.reject(error);
  }
);
