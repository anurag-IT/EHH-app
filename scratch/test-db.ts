import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQueryWithLikes() {
  const xUserId = "33"; 
  const currentUserId = parseInt(xUserId);
  const isValidUser = !isNaN(currentUserId);

  try {
    console.log("Testing Post.findMany with robust production logic...");
    
    const selectFields: any = {
      id: true,
      _count: { select: { likes: true } }
    };

    if (isValidUser) {
      selectFields.likes = {
        where: { userId: currentUserId },
        select: { id: true }
      };
    }

    const posts = await prisma.post.findMany({
      take: 2,
      select: selectFields
    });
    console.log("Query success! Found", posts.length, "posts.");
    console.log("Result:", JSON.stringify(posts, null, 2));
  } catch (err: any) {
    console.error("QUERY FAILED!");
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testQueryWithLikes();
