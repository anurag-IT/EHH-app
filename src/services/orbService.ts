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
  /**
   * Checks if the Python ORB service is healthy.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${ORB_SERVICE_URL}/health`, { timeout: 2000 });
      return response.data?.status === "healthy";
    } catch (error) {
      console.warn("[ORB SERVICE] Health check failed. Service might be down.");
      return false;
    }
  },

  /**
   * Compares two images using the external ORB service.
   * Includes one retry attempt on network failure.
   */
  async compareWithORB(imageUrl1: string, imageUrl2: string, retries = 1): Promise<ORBResponse> {
    try {
      if (!imageUrl1 || !imageUrl2) {
        throw new Error("Missing image URLs for ORB comparison");
      }

      const response = await axios.post<ORBResponse>(
        `${ORB_SERVICE_URL}/compare`,
        {
          image1: imageUrl1,
          image2: imageUrl2,
        },
        {
          timeout: 10000, // 10-second timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (retries > 0) {
        console.log(`[ORB SERVICE] Comparison failed, retrying... (${retries} left)`);
        return this.compareWithORB(imageUrl1, imageUrl2, retries - 1);
      }

      console.error("[ORB SERVICE] Error matching images:", error.message);
      return {
        matchScore: 0,
        confidence: "NONE",
        goodMatches: 0,
        totalKeypoints: 0,
        status: "ORB_SKIPPED",
        error: error.message,
      };
    }
  },
};
