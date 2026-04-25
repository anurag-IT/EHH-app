const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = "anuragit3121@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email }
  });
  console.log("USER DATA:", JSON.stringify(user, null, 2));
  
  if (user && (user.status === "BANNED" || user.status === "PERMANENT_BAN")) {
    console.log("User is banned. Unbanning...");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", banUntil: null, banReason: null }
    });
    console.log("SUCCESS: User unbanned.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
