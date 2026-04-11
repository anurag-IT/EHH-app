import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function check() {
  const users = await prisma.user.count();
  const posts = await prisma.post.count();
  console.log(`Users: ${users}, Posts: ${posts}`);
  process.exit();
}
check();
