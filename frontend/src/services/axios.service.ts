import axios from 'axios';
import { env } from 'next-runtime-env';
import { ConfigManager } from '@/lib/config-manager';

// Get API URL - from localStorage if Electron, from env if web
function getApiUrl(): string {
  const savedUrl = ConfigManager.getServerUrl();
  if (savedUrl) {
    return savedUrl;
  }
  return env('NEXT_PUBLIC_BACKEND_URL') || 'http://localhost:8091';
}

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
});

// Update baseURL if it changes (for Electron)
export function updateApiBaseUrl(url: string) {
  api.defaults.baseURL = url;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
