import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/attendance/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && record.userId !== session.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ attendance: record });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/attendance/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && existing.userId !== session.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (session.role !== "admin") {
    // Non-admins can only check out (set checkOutTime)
    const record = await prisma.attendance.update({
      where: { id },
      data: { checkOutTime: body.checkOutTime ?? new Date() },
    });
    return Response.json({ attendance: record });
  }

  // Admin edit path — accept a whitelisted set of fields and stamp audit columns.
  const allowed: Record<string, unknown> = {};
  let checkInTime: Date | null = existing.checkInTime ? new Date(existing.checkInTime) : null;
  let status = existing.status;

  if ("checkInTime" in body) {
    checkInTime = body.checkInTime ? new Date(body.checkInTime) : null;
    allowed.checkInTime = checkInTime;
  }
  if ("checkOutTime" in body) {
    allowed.checkOutTime = body.checkOutTime ? new Date(body.checkOutTime) : null;
  }
  if ("status" in body) {
    if (!["check-in", "leave", "sakit", "alpha", "comp_off"].includes(body.status)) {
      return Response.json(
        { error: "status must be one of: check-in, leave, sakit, alpha, comp_off" },
        { status: 400 },
      );
    }
    status = body.status;
    allowed.status = status;
    // Any non-attendance status clears the time fields.
    if (body.status !== "check-in") {
      allowed.checkInTime = null;
      allowed.checkOutTime = null;
      allowed.isLate = false;
      checkInTime = null;
    }
  }
  if ("isLate" in body) allowed.isLate = Boolean(body.isLate);
  if ("flagged" in body) allowed.flagged = Boolean(body.flagged);
  if ("flagNote" in body) allowed.flagNote = body.flagNote ?? null;
  if ("locationId" in body) allowed.locationId = body.locationId ?? null;

  // Auto-compute isLate if checkInTime changed and status is check-in
  if ("checkInTime" in body && status === "check-in" && checkInTime) {
    const cutoff = new Date(checkInTime);
    cutoff.setUTCHours(1, 0, 0, 0); // 08:00 WIB = 01:00 UTC
    allowed.isLate = checkInTime > cutoff;
  }

  const correctionNote =
    typeof body.correctionNote === "string" ? body.correctionNote.trim() : "";
  if (!correctionNote) {
    return Response.json({ error: "correctionNote is required for admin edits" }, { status: 400 });
  }

  allowed.correctionNote = correctionNote;
  allowed.correctedBy = session.userId;
  allowed.correctedAt = new Date();

  const record = await prisma.attendance.update({ where: { id }, data: allowed });
  return Response.json({ attendance: record });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/attendance/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.attendance.delete({ where: { id } });
  return Response.json({ success: true });
}
