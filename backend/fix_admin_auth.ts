import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = "anurag2thakur22@gmail.com";
const newPassword = "ehh_admin_secure_key_2026";

async function main() {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { email },
    data: { 
      password: hash,
      role: "ADMIN" 
    }
  });

  console.log(`Password for ${email} has been updated to: ${newPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
