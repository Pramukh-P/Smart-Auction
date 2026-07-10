import axios from "axios";
import { getToken } from "./authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 20000,
});

// First-party auth header — see authToken.ts for why this exists alongside
// the cookie.
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.message || err.message || "Something went wrong.";
    return Promise.reject(new Error(msg));
  }
);

export default api;