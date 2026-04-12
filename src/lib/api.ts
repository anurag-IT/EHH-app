import axios from "axios";

/**
 * Centralized API instance for the web app.
 * Includes a 5000ms timeout to prevent "Handshake Failure" caused by hanging requests.
 */
const api = axios.create({
  baseURL: "", // Use relative paths to benefit from Vite proxy
  timeout: 60000,
  headers: {
    // Axios will automatically set Content-Type for JSON or FormData
  },
});

// Automatically inject user ID header
api.interceptors.request.use((config) => {
  const saved = localStorage.getItem("social_user");
  if (saved) {
    const user = JSON.parse(saved);
    if (user.id) {
      config.headers["x-user-id"] = user.id;
    }
  }
  return config;
});

/**
 * Formats a Cloudinary URL with optimization parameters.
 * STRICT: w_600, q_auto, f_auto
 */
export const getOptimizedImageUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/w_600,q_auto,f_auto/");
};

export default api;
