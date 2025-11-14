import axios from "axios";
import { env } from "next-runtime-env";

const API_URL = env("NEXT_PUBLIC_BACKEND_URL");

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
  },
});

// Update baseURL if it changes (for Electron)
export function updateApiBaseUrl(url: string) {
  api.defaults.baseURL = url;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
