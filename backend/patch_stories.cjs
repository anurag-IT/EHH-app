const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function x() {
  try {
    console.log("Applying manual SQL patch for Stories upgrade...");
    
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoryReaction" (
        "id" SERIAL PRIMARY KEY,
        "storyId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "emoji" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await p.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "StoryReaction_storyId_userId_key" 
      ON "StoryReaction"("storyId", "userId");
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoryView" (
        "id" SERIAL PRIMARY KEY,
        "storyId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "StoryView_storyId_userId_key" 
      ON "StoryView"("storyId", "userId");
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoryReply" (
        "id" SERIAL PRIMARY KEY,
        "storyId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await p.$executeRawUnsafe(`
      ALTER TABLE "Story" 
      ADD COLUMN IF NOT EXISTS "caption" TEXT,
      ADD COLUMN IF NOT EXISTS "textColor" TEXT,
      ADD COLUMN IF NOT EXISTS "bgColor" TEXT,
      ADD COLUMN IF NOT EXISTS "stickers" JSONB;
    `);

    console.log("Story tables and columns patched successfully.");
  } catch (e) {
    console.error("SQL ERROR:", e.message);
  } finally {
    await p.$disconnect();
  }
}

x();
