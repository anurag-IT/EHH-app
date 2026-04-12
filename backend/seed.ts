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
  { name: "Paul Atreides", email: "paul@example.com" },
  { name: "Quinn Fabray", email: "quinn@example.com" },
  { name: "Rachel Green", email: "rachel@example.com" },
  { name: "Steve Rogers", email: "steve@example.com" },
  { name: "Tony Stark", email: "tony@example.com" },
  { name: "Uma Thurman", email: "uma@example.com" },
  { name: "Victor Stone", email: "victor@example.com" },
  { name: "Wanda Maximoff", email: "wanda@example.com" },
  { name: "Xander Cage", email: "xander@example.com" },
  { name: "Yoda Master", email: "yoda@example.com" },
  { name: "Zelda Fitzgerald", email: "zelda@example.com" },
  { name: "Arthur Curry", email: "arthur@example.com" },
  { name: "Bruce Wayne", email: "bruce@example.com" },
  { name: "Clark Kent", email: "clark@example.com" },
  { name: "David Rose", email: "david@example.com" },
];

const CAPTIONS = [
  "Sunset hits different here 🌄 #EHH",
  "Late night coding vibes 💻 #EHH",
  "Best coffee in town ☕ #EHH",
  "Nature is healing 🌿 #EHH",
  "Exploring the unknown 🚀 #EHH",
  "Good food, good mood 🍕 #EHH",
  "Weekend getaway! 🚗 #EHH",
  "Focus on the good ✨ #EHH",
  "Life is a journey 🌍 #EHH",
  "Tech stack of the day 🛠️ #EHH",
  "Morning routine ☀️ #EHH",
  "Stay hungry, stay foolish 🍎 #EHH",
  "City lights 🌃 #EHH",
  "Beach day 🏖️ #EHH",
  "Mountain high 🏔️ #EHH",
  "Feeling unstoppable today 💥 #EHH",
  "Living in the moment ⏳ #EHH",
  "Chasing the horizons 🏃 #EHH",
  "Embracing the chaos 🌪️ #EHH",
  "Quiet moments of reflection 🧘 #EHH",
  "Art in everyday life 🎨 #EHH",
  "Music makes everything better 🎵 #EHH",
  "Finding joy in the little things 🌼 #EHH",
  "Dreaming big, working hard 💼 #EHH",
  "Let the adventures begin 🗺️ #EHH",
  "Lost in the right direction 🧭 #EHH",
  "Creating my own sunshine 🌻 #EHH",
  "Grateful for another day 🙏 #EHH",
  "Building the future brick by brick 🏗️ #EHH",
  "Keep moving forward ➡️ #EHH"
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
  let response = await fetch(url);
  // Add a simple retry mechanism
  if (!response.ok) {
    for (let i = 0; i < 3; i++) {
        await new Promise(res => setTimeout(res, 1000));
        response = await fetch(url);
        if (response.ok) break;
    }
  }
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
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
      const phash = await getPHash(filePath);

      const post = await prisma.post.create({
        data: {
          userId: user.id,
          imagePath: filename,
          caption: CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
          phash,
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
        phash: parentPost.phash,
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
