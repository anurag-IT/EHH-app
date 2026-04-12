import axios from "axios";

const ORB_SERVICE_URL = process.env.ORB_SERVICE_URL || "http://localhost:8000";

interface ORBResponse {
  matchScore: number;
  confidence: string;
  goodMatches: number;
  totalKeypoints: number;
  status: string;
  error?: string;
}

export const orbService = {
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${ORB_SERVICE_URL}/health`, { timeout: 2000 });
      return response.data?.status === "healthy";
    } catch (error: any) {
      console.warn("[ORB SERVICE] Health check failed. Service might be down.");
      return false;
    }
  },

  async compareWithORB(imageUrl1: string, imageUrl2: string, retries = 1): Promise<ORBResponse> {
    try {
      if (!imageUrl1 || !imageUrl2) {
        throw new Error("Missing image URLs for ORB comparison");
      }

      const response = await axios.post<ORBResponse>(
        `${ORB_SERVICE_URL}/compare`,
        { image1: imageUrl1, image2: imageUrl2 },
        { timeout: 10000 }
      );

      return response.data;
    } catch (error: any) {
      if (retries > 0) {
        console.log(`[ORB SERVICE] Comparison failed, retrying... (${retries} left)`);
        return this.compareWithORB(imageUrl1, imageUrl2, retries - 1);
      }
      return {
        matchScore: 0, confidence: "NONE", goodMatches: 0, totalKeypoints: 0, status: "ORB_SKIPPED", error: error.message
      };
    }
  },

  async getDescriptors(imageUrl: string): Promise<{ descriptors: string; shape: number[] } | null> {
    try {
      const response = await axios.post(`${ORB_SERVICE_URL}/descriptors`, { image_url: imageUrl });
      if (response.data.status === "OK" && response.data.descriptors) {
        return { descriptors: response.data.descriptors, shape: response.data.shape };
      }
      return null;
    } catch (error: any) {
      console.error("[ORB SERVICE] Error getting descriptors:", error.message);
      return null;
    }
  },

  async matchDescriptors(des1: string, shape1: number[], des2: string, shape2: number[]): Promise<ORBResponse> {
    try {
      const response = await axios.post<ORBResponse>(`${ORB_SERVICE_URL}/match-descriptors`, { des1, shape1, des2, shape2 });
      return response.data;
    } catch (error: any) {
      console.error("[ORB SERVICE] Error matching descriptors:", error.message);
      return {
        matchScore: 0, confidence: "NONE", goodMatches: 0, totalKeypoints: 0, status: "ORB_SKIPPED", error: error.message
      };
    }
  },
};
