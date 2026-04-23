import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const email = "anurag2thakur2@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (user) {
    console.log("User found:", JSON.stringify(user, null, 2));
  } else {
    console.log("User NOT found");
  }
  await prisma.$disconnect();
}

main();
