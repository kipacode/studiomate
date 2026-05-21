import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  if (session.role === "admin") {
    const today = new Date().toISOString().split("T")[0];
    const activeExists = await prisma.qRToken.findFirst({
      where: { validDate: today, isActive: true },
    });
    if (!activeExists) {
      const dateStr = today.replace(/-/g, "");
      const tokenStr = `KIPA-${dateStr}-STUDIO`;
      await prisma.qRToken.upsert({
        where: { token: tokenStr },
        update: { isActive: true },
        create: {
          token: tokenStr,
          validDate: today,
          createdBy: session.userId,
          isActive: true,
        },
      });
    }
  }

  const tokens = await prisma.qRToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ tokens });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { validDate } = body;

  if (!validDate) {
    return Response.json({ error: "validDate is required" }, { status: 400 });
  }

  // Deactivate other tokens for the same date
  await prisma.qRToken.updateMany({
    where: { validDate },
    data: { isActive: false },
  });

  const dateStr = validDate.replace(/-/g, "");
  const token = await prisma.qRToken.create({
    data: {
      token: `KIPA-${dateStr}-STUDIO`,
      validDate,
      createdBy: session.userId,
      isActive: true,
    },
  });

  return Response.json({ token }, { status: 201 });
}
