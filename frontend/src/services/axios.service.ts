import axios from 'axios';
import { getPublicEnv } from '@/lib/public-env';

const api = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
  },
});

api.interceptors.request.use((config) => {
  config.baseURL = getPublicEnv('NEXT_PUBLIC_BACKEND_URL');
  return config;
});

export default api;
