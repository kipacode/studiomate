import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const VALID_STATUSES = ["check-in", "leave", "sakit", "alpha", "comp_off"];

/**
 * Admin-only: create an Attendance record for a past date the member missed,
 * or where leave/correction needs to be applied retroactively.
 * Server-stamps correctedBy/correctedAt. Rejects if a record already exists
 * for (userId, date) — admin should PUT to that record instead.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const {
    userId,
    date,
    checkInTime,
    checkOutTime,
    status = "check-in",
    correctionNote,
    locationId,
  } = body;

  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!correctionNote || typeof correctionNote !== "string" || !correctionNote.trim()) {
    return Response.json({ error: "correctionNote is required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) {
    return Response.json(
      { error: "Record already exists for this date — edit it instead", existingId: existing.id },
      { status: 409 },
    );
  }

  const parsedCheckIn = checkInTime ? new Date(checkInTime) : null;
  const parsedCheckOut = checkOutTime ? new Date(checkOutTime) : null;

  if (status === "check-in" && !parsedCheckIn) {
    return Response.json({ error: "checkInTime required for status 'check-in'" }, { status: 400 });
  }

  // Compute isLate: check-in is after 08:00 WIB (01:00 UTC)
  let isLate = false;
  if (status === "check-in" && parsedCheckIn) {
    const cutoff = new Date(parsedCheckIn);
    cutoff.setUTCHours(1, 0, 0, 0); // 08:00 WIB = 01:00 UTC
    isLate = parsedCheckIn > cutoff;
  }

  const record = await prisma.attendance.create({
    data: {
      userId,
      date,
      // Only a real "check-in" carries clock times; comp_off counts as present but has none.
      checkInTime: status === "check-in" ? parsedCheckIn : null,
      checkOutTime: status === "check-in" ? parsedCheckOut : null,
      qrTokenUsed: "ADMIN_BACKFILL",
      isLate,
      status,
      locationId: locationId ?? null,
      correctedBy: session.userId,
      correctedAt: new Date(),
      correctionNote: correctionNote.trim(),
    },
  });

  return Response.json({ attendance: record }, { status: 201 });
}
