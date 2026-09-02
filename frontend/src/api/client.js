import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.message || error.message || "An unexpected network error occurred";
    if (message.includes("JSON") || message.includes("Unexpected token") || message.includes("non-whitespace character")) {
      message = "Server returned an invalid response payload format. Please re-run ingestion.";
    }
    return Promise.reject(new Error(message));
  }
);
