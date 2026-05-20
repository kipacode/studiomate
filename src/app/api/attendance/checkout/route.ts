import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function POST() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.userId, date: today } },
  });

  if (!record) return Response.json({ error: "No check-in found for today" }, { status: 404 });
  if (record.checkOutTime) return Response.json({ error: "Already checked out" }, { status: 409 });

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: { checkOutTime: new Date() },
  });

  return Response.json({ attendance: updated });
}
