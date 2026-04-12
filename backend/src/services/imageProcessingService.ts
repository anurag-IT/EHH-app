import crypto from "crypto";
import { imageHash } from "image-hash";
import { PrismaClient } from "@prisma/client";
import { findMatchesAndLog } from "./imageSimilarityService.js";
import { orbService } from "./orbService.js";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

const prisma = new PrismaClient() as any;
let model: mobilenet.MobileNet | null = null;

async function loadModel() {
  if (!model) {
    console.log("[AI] Loading MobileNet model...");
    model = await mobilenet.load();
    console.log("[AI] MobileNet loaded.");
  }
  return model;
}

function binaryToHex(bin: string): string {
  let hex = "";
  for (let i = 0; i < bin.length; i += 4) {
    hex += parseInt(bin.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}

async function getAHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  let total = 0;
  for (let i = 0; i < data.length; i++) total += data[i];
  const avg = total / data.length;
  
  let bin = "";
  for (let i = 0; i < data.length; i++) {
    bin += data[i] >= avg ? "1" : "0";
  }
  return binaryToHex(bin);
}
async function getDHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  let bin = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bin += left > right ? "1" : "0";
    }
  }
  return binaryToHex(bin);
}

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

async function getAIEmbedding(buffer: Buffer): Promise<string | null> {
  try {
    const net = await loadModel();
    const { data } = await sharp(buffer)
      .resize(224, 224, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = tf.tensor3d(new Uint8Array(data), [224, 224, 3]);
    const activation = net.infer(tensor, true);
    const embedding = await activation.array() as number[][];
    
    tensor.dispose();
    activation.dispose();

    return JSON.stringify(embedding[0]);
  } catch (err: any) {
    console.error("[AI ERROR]", err);
    return null;
  }
}

export const extractFeaturesFromBuffer = async (fileBuffer: Buffer, imageUrlForOrb?: string) => {
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const ahash = await getAHash(fileBuffer);
  const dhash = await getDHash(fileBuffer);
  const phash = await getPHash({ data: fileBuffer, name: "img.jpg" });
  const embedding = await getAIEmbedding(fileBuffer);
  
  let orb = null;
  if (imageUrlForOrb) {
    const orbData = await orbService.getDescriptors(imageUrlForOrb);
    orb = orbData ? JSON.stringify(orbData) : null;
  }

  return { sha256, ahash, dhash, phash, embedding, orb };
};

export const processImageAsync = async (postId: number, imageUrl: string) => {
  try {
    console.log(`[ASYNC START] Processing post ${postId} in background...`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed asset: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const ahash = await getAHash(fileBuffer);
    const dhash = await getDHash(fileBuffer);
    const phash = await getPHash({ data: fileBuffer, name: "img.jpg" });
    const embedding = await getAIEmbedding(fileBuffer);
    const orbData = await orbService.getDescriptors(imageUrl);
    const orb = orbData ? JSON.stringify(orbData) : null;

    await prisma.post.update({
      where: { id: postId },
      data: { sha256, ahash, dhash, phash, embedding, orb }
    });

    await findMatchesAndLog(postId, phash, dhash, imageUrl).catch((matchErr: any) => {
      console.error(`[ASYNC FAILURE] Match analysis failed for post ${postId}:`, matchErr);
    });
  } catch (error: any) {
    console.error(`[ASYNC FATAL ERROR] Pipeline failed for post ${postId}:`, error.message);
  }
};
