import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const locations = await prisma.location.findMany({
    orderBy: { label: "asc" },
  });

  return Response.json({ locations });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { label, address, lat, lng, radiusMeters } = body;

  if (!label || !address || lat == null || lng == null) {
    return Response.json({ error: "label, address, lat, and lng are required" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      label,
      address,
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: Number(radiusMeters ?? 100),
      createdBy: session.userId,
      isActive: true,
    },
  });

  return Response.json({ location }, { status: 201 });
}
