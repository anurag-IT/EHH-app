const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log("Cleaning up stale hash columns from database...");
  try {
    // Drop sha256, hash, ahash if they exist — only phash is the standard
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" DROP COLUMN IF EXISTS "sha256"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" DROP COLUMN IF EXISTS "hash"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" DROP COLUMN IF EXISTS "ahash"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Post_sha256_idx"`);
    console.log("SUCCESS! Stale hash columns removed.");
    
    // Verify by doing a clean query
    const posts = await prisma.post.findMany({ take: 1 });
    console.log("Verification passed — posts query works correctly!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
