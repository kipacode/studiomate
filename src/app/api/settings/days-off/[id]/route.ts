import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// DELETE — remove a day off by id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.dayOff.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Day off not found" }, { status: 404 });
  }
}
