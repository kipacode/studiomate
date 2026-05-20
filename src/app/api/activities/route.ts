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

  const effectiveUserId = session.role !== "admin" ? session.userId : (userId ?? undefined);

  const activities = await prisma.activityLog.findMany({
    where: {
      ...(date ? { date } : {}),
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    },
    include: withUser ? { user: { omit: { password: true } } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ activities });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { taskTitle, category, description, status, estimatedHours, date } = body;

  if (!taskTitle || !category || !estimatedHours) {
    return Response.json({ error: "taskTitle, category, and estimatedHours are required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const activity = await prisma.activityLog.create({
    data: {
      userId: session.userId,
      date: date ?? today,
      taskTitle,
      category,
      description,
      status: status ?? "in_progress",
      estimatedHours: Number(estimatedHours),
    },
  });

  return Response.json({ activity }, { status: 201 });
}
