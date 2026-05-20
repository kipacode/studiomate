import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const userId = searchParams.get("userId");
  const withUser = searchParams.get("withUser") === "true";

  // Non-admins can only see their own attendance
  const effectiveUserId = session.role !== "admin" ? session.userId : (userId ?? undefined);

  const records = await prisma.attendance.findMany({
    where: {
      ...(date ? { date } : {}),
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    },
    include: withUser ? { user: { omit: { password: true } } } : undefined,
    orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
  });

  return Response.json({ attendance: records });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { qrToken, date } = body;

  if (!qrToken) {
    return Response.json({ error: "qrToken is required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const attendanceDate = date ?? today;

  // Validate QR token
  const token = await prisma.qRToken.findFirst({
    where: { token: qrToken, validDate: attendanceDate, isActive: true },
  });
  if (!token) {
    return Response.json({ error: "Invalid or expired QR token" }, { status: 422 });
  }

  // Check for existing record
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.userId, date: attendanceDate } },
  });
  if (existing) {
    return Response.json({ error: "Already checked in for today" }, { status: 409 });
  }

  const checkInTime = new Date();
  const cutoff = new Date(checkInTime);
  cutoff.setHours(8, 0, 0, 0);
  const isLate = checkInTime > cutoff;

  const record = await prisma.attendance.create({
    data: {
      userId: session.userId,
      date: attendanceDate,
      checkInTime,
      qrTokenUsed: qrToken,
      isLate,
    },
  });

  return Response.json({ attendance: record }, { status: 201 });
}
