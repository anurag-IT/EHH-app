import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'ehh_submissions'
    `;
    console.log("Columns in ehh_submissions table:");
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error("Error fetching columns:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
