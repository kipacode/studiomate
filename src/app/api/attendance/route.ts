import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("userId");
  const withUser = searchParams.get("withUser") === "true";

  // Non-admins can only see their own attendance
  const effectiveUserId = session.role !== "admin" ? session.userId : (userId ?? undefined);

  // Build date filter: single `date` wins; otherwise apply from/to range
  const dateFilter = date
    ? { date }
    : (from || to)
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};

  const records = await prisma.attendance.findMany({
    where: {
      ...dateFilter,
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    },
    include: withUser ? { user: { omit: { password: true } }, location: true } : { location: true },
    orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
  });

  return Response.json({ attendance: records });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { qrToken, date, status = "check-in", locationId } = body;

  const today = new Date().toISOString().split("T")[0];
  const attendanceDate = date ?? today;

  // Check for existing record
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.userId, date: attendanceDate } },
  });

  if (status === "leave") {
    if (existing) {
      if (existing.status === "leave") {
        return Response.json({ error: "Already registered as On Leave for today" }, { status: 409 });
      }
      if (existing.checkInTime) {
        return Response.json({ error: "Cannot register leave: already checked in today" }, { status: 409 });
      }
      
      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: "leave",
          checkInTime: null,
          isLate: false,
        },
      });
      return Response.json({ attendance: record }, { status: 200 });
    }

    const record = await prisma.attendance.create({
      data: {
        userId: session.userId,
        date: attendanceDate,
        checkInTime: null,
        qrTokenUsed: "DASHBOARD",
        isLate: false,
        status: "leave",
      },
    });
    return Response.json({ attendance: record }, { status: 201 });
  }

  // Otherwise, it's a check-in status scan
  if (!qrToken) {
    return Response.json({ error: "qrToken is required" }, { status: 400 });
  }

  if (qrToken !== "DASHBOARD") {
    // Validate QR token
    const token = await prisma.qRToken.findFirst({
      where: { token: qrToken, validDate: attendanceDate, isActive: true },
    });
    if (!token) {
      return Response.json({ error: "Invalid or expired QR token" }, { status: 422 });
    }
  }

  if (existing) {
    if (existing.status === "leave") {
      return Response.json({ error: "You are on leave today and cannot check in" }, { status: 400 });
    }
    return Response.json({ error: "Already checked in for today" }, { status: 409 });
  }

  // Validate locationId if provided
  if (locationId) {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return Response.json({ error: "Invalid location" }, { status: 400 });
    }
  } else if (status === "check-in") {
    return Response.json({ error: "Location is required to check in" }, { status: 400 });
  }

  const checkInTime = new Date();
  const cutoff = new Date(checkInTime);
  cutoff.setUTCHours(1, 0, 0, 0); // 08:00 WIB = 01:00 UTC
  const isLate = checkInTime > cutoff;

  const record = await prisma.attendance.create({
    data: {
      userId: session.userId,
      date: attendanceDate,
      checkInTime,
      qrTokenUsed: qrToken,
      isLate,
      status: "check-in",
      locationId,
    },
  });

  return Response.json({ attendance: record }, { status: 201 });
}
