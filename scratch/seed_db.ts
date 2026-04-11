import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Mocking image-hash to avoid mime-type errors in seed
const prisma = new PrismaClient();

async function seed() {
  console.log("Starting restoration (Resilient mode)...");

  const adminEmail = "anurag2thakur22@gmail.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      name: "Anurag Thakur",
      email: adminEmail,
      uniqueId: "EH-ADMIN",
      avatar: `https://i.pravatar.cc/150?u=${adminEmail}`,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
  console.log(`Admin created/updated: ${admin.name}`);

  const user1Email = "user1@example.com";
  const user1 = await prisma.user.upsert({
    where: { email: user1Email },
    update: {},
    create: {
      name: "Environmentalist",
      email: user1Email,
      uniqueId: "EH-777777",
      avatar: `https://i.pravatar.cc/150?u=${user1Email}`,
      status: "ACTIVE"
    }
  });

  const uploadDir = path.join(process.cwd(), "uploads");
  const files = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg") || f.toLowerCase().endsWith(".png"));
  
  console.log(`Found ${files.length} images. Processing first 30...`);

  const sampleCaptions = [
    "Clean Earth, Green Earth! 🌍✨",
    "Preserving our natural heritage. #EHH",
    "Sustainability is the future. ☘️",
    "Protecting our planet, one post at a time.",
    "Breathtaking beauty of nature.",
    "Community action for climate change.",
    "Natural splendor captured.",
    "Greener tomorrow starts today!"
  ];

  const imagesToSeed = files.slice(0, 30);

  for (const filename of imagesToSeed) {
    try {
      const filePath = path.join(uploadDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Skip empty files
      if (fileBuffer.length < 100) continue;

      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      
      // Using a deterministic pHash based on sha256 to avoid image-hash crashes
      const mockPHash = sha256.substring(0, 16); 

      await prisma.post.create({
        data: {
          userId: admin.id,
          caption: sampleCaptions[Math.floor(Math.random() * sampleCaptions.length)],
          imagePath: filename,
          location: "EHH Protected Area",
          sha256,
          phash: mockPHash,
          hash: sha256.substring(0, 16)
        }
      });
      process.stdout.write(".");
    } catch (e) {
      console.log(`\nSkipping ${filename} due to error`);
    }
  }

  console.log("\nRestoration successful.");
  process.exit();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
