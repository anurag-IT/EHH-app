const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log("Applying Database Fix (Surgical Mode)...");
  try {
    // Manually add the missing columns via RAW SQL
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "sha256" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "hash" TEXT`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Post_sha256_idx" ON "Post"("sha256")`);
    
    console.log("SUCCESS! Missing columns added to Supabase.");
    console.log("Now verifying...");
    
    const posts = await prisma.post.findMany({ take: 1 });
    console.log("Verification successful! Posts can now be queried.");
  } catch (error) {
    console.error("FAILURE! Could not patch database.");
    console.error("Full Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
