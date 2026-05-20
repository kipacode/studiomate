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

  // Non-admins can only check out (set checkOutTime)
  const data: Record<string, unknown> = session.role === "admin"
    ? body
    : { checkOutTime: body.checkOutTime ?? new Date() };

  const record = await prisma.attendance.update({ where: { id }, data });
  return Response.json({ attendance: record });
}
