import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// If testing on Android Emulator, localhost should be 10.0.2.2.
// For a physical device or generic expo testing, you usually use your computer's local IP address.
export const DEV_API_URL = "https://ehh-api-production.loca.lt";

const api = axios.create({
  baseURL: DEV_API_URL,
  timeout: 30000, 
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const userId = await AsyncStorage.getItem("userId");
  if (userId) {
    config.headers["x-user-id"] = userId;
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
