import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const updated = await prisma.location.update({
      where: { id },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.lat !== undefined && { lat: Number(body.lat) }),
        ...(body.lng !== undefined && { lng: Number(body.lng) }),
        ...(body.radiusMeters !== undefined && { radiusMeters: Number(body.radiusMeters) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return Response.json({ location: updated }, { status: 200 });
  } catch (error) {
    return Response.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft delete by setting isActive to false
    const deleted = await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({ location: deleted }, { status: 200 });
  } catch (error) {
    return Response.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
