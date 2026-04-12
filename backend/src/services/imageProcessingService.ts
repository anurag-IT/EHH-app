import { imageHash } from "image-hash";
import { PrismaClient } from "@prisma/client";
import { findMatchesAndLog } from "./imageSimilarityService.js";
import sharp from "sharp";

const prisma = new PrismaClient() as any;

async function getPHash(data: any): Promise<string> {
  const buffer = data.data;
  const processedBuffer = await sharp(buffer)
    .resize(64, 64, { fit: "fill" })
    .toBuffer();

  return new Promise((resolve, reject) => {
    imageHash({ data: processedBuffer, name: "img.jpg" }, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}

export const extractFeaturesFromBuffer = async (fileBuffer: Buffer) => {
  const phash = await getPHash({ data: fileBuffer, name: "img.jpg" });
  return { phash };
};

export const processImageAsync = async (postId: number, imageUrl: string) => {
  try {
    console.log(`[ASYNC START] Processing post ${postId} in background (pHash only)...`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed asset: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const phash = await getPHash({ data: fileBuffer, name: "img.jpg" });

    await prisma.post.update({
      where: { id: postId },
      data: { phash }
    });

    await findMatchesAndLog(postId, phash, null, imageUrl).catch((matchErr: any) => {
      console.error(`[ASYNC FAILURE] Match analysis failed for post ${postId}:`, matchErr);
    });
  } catch (error: any) {
    console.error(`[ASYNC FATAL ERROR] Pipeline failed for post ${postId}:`, error.message);
  }
};
