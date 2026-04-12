import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing single insert...');
  try {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        uniqueId: 'EH-TEST12',
      }
    });
    console.log('SUCCESS: Created user', user.id);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
