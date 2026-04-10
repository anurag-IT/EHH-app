import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { imageHash } from "image-hash";

const prisma = new PrismaClient();

const USERS = [
  { name: "Alice Freeman", email: "alice@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
  { name: "Charlie Brown", email: "charlie@example.com" },
  { name: "Diana Prince", email: "diana@example.com" },
  { name: "Ethan Hunt", email: "ethan@example.com" },
  { name: "Fiona Gallagher", email: "fiona@example.com" },
  { name: "George Costanza", email: "george@example.com" },
  { name: "Hannah Abbott", email: "hannah@example.com" },
  { name: "Ian Malcolm", email: "ian@example.com" },
  { name: "Julia Roberts", email: "julia@example.com" },
  { name: "Kevin Hart", email: "kevin@example.com" },
  { name: "Laura Croft", email: "laura@example.com" },
  { name: "Mike Wazowski", email: "mike@example.com" },
  { name: "Nina Williams", email: "nina@example.com" },
  { name: "Oscar Isaac", email: "oscar@example.com" },
];

const CAPTIONS = [
  "Sunset hits different here 🌄",
  "Late night coding vibes 💻",
  "Best coffee in town ☕",
  "Nature is healing 🌿",
  "Exploring the unknown 🚀",
  "Good food, good mood 🍕",
  "Weekend getaway! 🚗",
  "Focus on the good ✨",
  "Life is a journey 🌍",
  "Tech stack of the day 🛠️",
  "Morning routine ☀️",
  "Stay hungry, stay foolish 🍎",
  "City lights 🌃",
  "Beach day 🏖️",
  "Mountain high 🏔️",
];

function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "EH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getPHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}

async function getImageHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, buffer };
}

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create Users
  const createdUsers = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        uniqueId: generateUniqueId(),
        avatar: `https://i.pravatar.cc/150?u=${u.email}`,
      },
    });
    createdUsers.push(user);
  }
  console.log(`✅ Created ${createdUsers.length} users.`);

  // 2. Create Posts
  const createdPosts = [];
  for (let i = 0; i < 30; i++) {
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const seed = `post_${i}`;
    const filename = `${Date.now()}_${i}.jpg`;
    const url = `https://picsum.photos/seed/${seed}/800/800`;
    
    try {
      const { filePath, buffer } = await downloadImage(url, filename);
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const phash = await getPHash(filePath);
      const hash = await getImageHash(filePath);

      const post = await prisma.post.create({
        data: {
          userId: user.id,
          imagePath: filename,
          caption: CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
          sha256,
          phash,
          hash,
        },
      });
      createdPosts.push(post);
      process.stdout.write(".");
    } catch (err) {
      console.error(`Failed to download image ${i}:`, err);
    }
  }
  console.log(`\n✅ Created 30 original posts.`);

  // 3. Create Repost Chains
  for (let i = 0; i < 15; i++) {
    const parentPost = createdPosts[Math.floor(Math.random() * createdPosts.length)];
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    
    await prisma.post.create({
      data: {
        userId: user.id,
        imagePath: parentPost.imagePath,
        caption: `Repost: ${parentPost.caption}`,
        sha256: parentPost.sha256,
        phash: parentPost.phash,
        hash: parentPost.hash,
        parentId: parentPost.id,
      },
    });
  }
  console.log(`✅ Created 15 reposts.`);

  console.log("✨ Seeding complete!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
