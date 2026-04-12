import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLikeToggle() {
  const userId = 33; // Mocking current user
  const postId = 135; // A known post ID
  
  try {
    console.log(`Toggling like for User ${userId} on Post ${postId}...`);
    
    let result;
    try {
      // ATTEMPT CREATE
      await prisma.like.create({
        data: { userId, postId }
      });
      console.log("-> Like created (POST liked)");
      result = { liked: true };
    } catch (e: any) {
      if (e.code === "P2002") {
        // ALREADY EXISTS -> DELETE
        await prisma.like.delete({
          where: { userId_postId: { userId, postId } }
        });
        console.log("-> Like removed (POST unliked)");
        result = { liked: false };
      } else {
        throw e;
      }
    }
    
    console.log("Final State:", result);
  } catch (err: any) {
    console.error("LIKE TOGGLE FAILED!", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLikeToggle();
