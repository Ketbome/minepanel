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

export default api;
