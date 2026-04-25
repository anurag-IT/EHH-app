import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_TOKEN_KEY = "ehh_token";
export const USER_STORAGE_KEY = "ehh_user";
export const DEV_API_URL = process.env.EXPO_PUBLIC_API_URL || "https://ehh-api-production.loca.lt";

const api = axios.create({
  baseURL: DEV_API_URL,
  timeout: 30000, 
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Formats a Cloudinary URL with optimization parameters.
 * USES: f_auto, q_auto, w_auto
 */
export const getOptimizedImageUrl = (url: string, width: number | string = "auto") => {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;
  
  const transformations = `f_auto,q_auto,w_${width}`;
  
  if (url.includes("/upload/v")) {
    return url.replace("/upload/", `/upload/${transformations}/`);
  }
  
  if (url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/${transformations}/`);
  }

  return url;
};

export default api;
