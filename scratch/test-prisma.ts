import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.notification.count();
    console.log("Notification count:", count);
  } catch (err) {
    console.error("Error accessing notification:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
