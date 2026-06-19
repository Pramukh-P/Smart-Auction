import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.message || err.message || "Something went wrong.";
    return Promise.reject(new Error(msg));
  }
);

export default api;