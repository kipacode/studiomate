import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: "intern" },
    data: { internshipStart: "2026-01-06" },
  });
  console.log(`Updated ${result.count} interns → internshipStart = 2026-01-06`);

  // Verify
  const interns = await prisma.user.findMany({
    where: { role: "intern" },
    select: { username: true, internshipStart: true },
    orderBy: { username: "asc" },
  });
  for (const u of interns) {
    console.log(`  ${u.username}: ${u.internshipStart}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
