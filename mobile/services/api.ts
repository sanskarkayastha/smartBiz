import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';

export const api = axios.create({ baseURL: API_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  const userId = await SecureStore.getItemAsync('userId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (userId) config.headers['X-User-Id'] = userId;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('token');
      SecureStore.deleteItemAsync('userId');
      SecureStore.deleteItemAsync('userInfo');
    }
    return Promise.reject(error);
  }
);
