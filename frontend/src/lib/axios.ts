import axios from "axios";
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 20000,
});
api.interceptors.response.use(r => r, err => {
  const msg = err.response?.data?.message || err.message || "Something went wrong.";
  return Promise.reject(new Error(msg));
});
export default api;
