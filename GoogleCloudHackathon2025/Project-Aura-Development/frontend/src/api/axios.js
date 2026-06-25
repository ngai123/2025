import axios from "axios";

// Base URL comes from Vite env (set in .env), fallback to local backend
const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").trim();

// Create a single axios instance for the app
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header if a token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Simple response/error handling for consistency
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally, map common error shapes or log here
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };