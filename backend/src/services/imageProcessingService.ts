import { imageHash } from "image-hash";
import { PrismaClient } from "@prisma/client";
import { findMatchesAndLog } from "./imageSimilarityService.js";
import sharp from "sharp";

const prisma = new PrismaClient() as any;

/**
 * Detects image format from buffer magic bytes and returns correct filename.
 * This is needed because image-hash uses the filename extension to pick the decoder.
 */
function getImageFilename(buffer: Buffer): string {
  // PNG: starts with 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'img.png';
  // GIF: starts with 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'img.gif';
  // BMP: starts with 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'img.bmp';
  // TIFF: starts with 49 49 or 4D 4D
  if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) return 'img.tiff';
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57 && buffer[9] === 0x45) return 'img.webp';
  // Default: JPEG (FF D8) or anything else — Sharp will handle the actual decode
  return 'img.jpg';
}

async function getPHash(data: any): Promise<string> {
  const buffer = data.data;
  // Sharp normalizes ALL formats to a standard buffer — convert to PNG first
  // so image-hash always gets a consistent format regardless of input
  const processedBuffer = await sharp(buffer)
    .resize(64, 64, { fit: "fill" })
    .png()  // ← normalize output to PNG so image-hash always works
    .toBuffer();

  return new Promise((resolve, reject) => {
    imageHash({ data: processedBuffer, name: "img.png" }, 16, true, (error: any, data: string) => {  // ← name is now always img.png
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
