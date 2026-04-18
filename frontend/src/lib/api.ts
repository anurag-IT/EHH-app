import axios from "axios";

/**
 * Centralized API instance for the web app.
 * Includes a 5000ms timeout to prevent "Handshake Failure" caused by hanging requests.
 */
const API_URL = import.meta.env.VITE_API_URL || "";
console.log("DEBUG: Connecting to API at:", API_URL || "CURRENT DOMAIN (RELATIVE)");

const api = axios.create({
  baseURL: API_URL, 
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
 * USES: f_auto, q_auto, w_auto, dpr_auto
 */
export const getOptimizedImageUrl = (url: string, width: number | string = "auto") => {
  if (!url || url === "null" || url === "undefined" || url.includes("[object")) return "";
  if (!url.includes("cloudinary.com")) return url;
  
  // Standardize Cloudinary URL to use auto-format, auto-quality and specified width
  // Also added dpr_auto for high-density displays
  const transformations = `f_auto,q_auto,w_${width},dpr_auto`;
  
  if (url.includes("/upload/v")) {
    return url.replace("/upload/", `/upload/${transformations}/`);
  }
  
  if (url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/${transformations}/`);
  }

  return url;
};

export default api;
