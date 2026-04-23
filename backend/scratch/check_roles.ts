import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });
  console.log("Users:", JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

check();
