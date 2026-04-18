const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log("Attempting to connect to database...");
  try {
    const userCount = await prisma.user.count();
    console.log("SUCCESS! Database is reachable. User count:", userCount);
  } catch (error) {
    console.error("FAILURE! Cannot reach database.");
    console.error("Error Code:", error.code);
    console.error("Full Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
