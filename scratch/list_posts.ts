import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function list() {
  const posts = await prisma.post.findMany({ take: 5 });
  console.log(JSON.stringify(posts, null, 2));
  process.exit();
}
list();
