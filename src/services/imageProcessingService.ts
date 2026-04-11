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
    console.log(`[ASYNC] Processing started for post ${postId}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    
    const hashData = { data: fileBuffer, name: 'image.jpg' };
    const phash = await getPHash(hashData);
    const hash = await getImageHash(hashData);

    await prisma.post.update({
      where: { id: postId },
      data: {
        sha256,
        phash,
        hash
      }
    });

    console.log(`[ASYNC] Processing completed for post ${postId}`);

    // Trigger Similarity Comparison
    await findMatchesAndLog(postId, phash, hash);

  } catch (error) {
    console.error(`[ASYNC] Error processing image for post ${postId}:`, error);
  }
};
