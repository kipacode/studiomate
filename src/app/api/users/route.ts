import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as string | null;
  const status = searchParams.get("status") as string | null;

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role: role as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    omit: { password: true },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, username, email, password, role, status, birthDate, internshipStart, internshipEnd } = body;

  if (!name || !username || !email || !password) {
    return Response.json({ error: "name, username, email, and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return Response.json({ error: "Username or email already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, username, email, password: hashed, role, status, birthDate, internshipStart, internshipEnd },
    omit: { password: true },
  });

  return Response.json({ user }, { status: 201 });
}
