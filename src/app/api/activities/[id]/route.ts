import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/activities/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const activity = await prisma.activityLog.findUnique({ where: { id } });
  if (!activity) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && activity.userId !== session.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ activity });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/activities/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.activityLog.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && existing.userId !== session.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { taskTitle, category, description, status, estimatedHours } = body;

  const activity = await prisma.activityLog.update({
    where: { id },
    data: {
      ...(taskTitle !== undefined && { taskTitle }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(estimatedHours !== undefined && { estimatedHours: Number(estimatedHours) }),
    },
  });

  return Response.json({ activity });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/activities/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.activityLog.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && existing.userId !== session.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.activityLog.delete({ where: { id } });
  return Response.json({ success: true });
}
