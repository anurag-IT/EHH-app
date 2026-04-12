import crypto from "crypto";
import { imageHash } from "image-hash";
import { PrismaClient } from "@prisma/client";
import { findMatchesAndLog } from "./imageSimilarityService.js";

const prisma = new PrismaClient() as any;

function getImageHash(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(data, 16, true, (err: any, data: string) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function getPHash(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(data, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}

export const processImageAsync = async (postId: number, imageUrl: string) => {
  try {
    console.log(`[ASYNC START] Processing post ${postId} in background...`);
    
    // REQUIREMENT: Resilient Fetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed asset: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    console.log(`[ASYNC] Asset fetched for ${postId}. Generating hashes...`);
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    
    const hashData = { data: fileBuffer, name: 'image.jpg' };
    const phash = await getPHash(hashData);
    const hash = await getImageHash(hashData);

    await prisma.post.update({
      where: { id: postId },
      data: { sha256, phash, hash }
    });

    console.log(`[ASYNC] Hashes committed for ${postId}. Triggering similarity net...`);

    // Trigger Similarity Comparison (Non-blocking internal call)
    await findMatchesAndLog(postId, phash, hash, imageUrl).catch(matchErr => {
      console.error(`[ASYNC FAILURE] Match analysis failed for post ${postId}:`, matchErr);
    });

    console.log(`[ASYNC SUCCESS] Pipeline completed for post ${postId}`);

  } catch (error: any) {
    // REAL FIX: Clear, categorized failure logging
    console.error(`[ASYNC FATAL ERROR] Pipeline failed for post ${postId}:`, error.message);
  }
};
