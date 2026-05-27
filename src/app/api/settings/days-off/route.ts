import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// GET  — list days off (optionally filter by ?year=2026&month=5)
// POST — add a day off { date, label? }
export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  let where: Record<string, any> = {};

  if (year && month) {
    // Filter by YYYY-MM prefix
    const prefix = `${year}-${month.padStart(2, "0")}`;
    where = {
      date: { startsWith: prefix },
    };
  } else if (year) {
    where = {
      date: { startsWith: year },
    };
  }

  const daysOff = await prisma.dayOff.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return Response.json({ daysOff });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { date, label } = body;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD format" }, { status: 400 });
  }

  // Check if already exists
  const existing = await prisma.dayOff.findUnique({ where: { date } });
  if (existing) {
    return Response.json({ error: "This date is already marked as a day off" }, { status: 409 });
  }

  const dayOff = await prisma.dayOff.create({
    data: {
      date,
      label: label || null,
      createdBy: session.userId,
    },
  });

  return Response.json({ dayOff }, { status: 201 });
}
