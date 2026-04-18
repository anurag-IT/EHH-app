const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log("Step 1: Re-adding sha256 so current live server stops crashing...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "sha256" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "hash" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "ahash" TEXT`);
    console.log("Done. Columns restored so the current Render server works.");
    
    const posts = await prisma.post.findMany({ take: 1 });
    console.log("Verification passed! Current live server should stop crashing now.");
    console.log("Next Render deploy will use new schema (phash only) and clean this up automatically.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
