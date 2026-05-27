import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Invalidate cached client if schema changed (e.g. new model added during dev)
if (globalForPrisma.prisma && (!('workdaySettings' in globalForPrisma.prisma) || !('dayOff' in globalForPrisma.prisma))) {
  delete (globalForPrisma as any).prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
