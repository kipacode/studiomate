import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (session.role !== "admin" && session.userId !== id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id }, omit: { password: true } });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ user });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (session.role !== "admin" && session.userId !== id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { password, ...rest } = body;

  const data: Record<string, unknown> = { ...rest };
  if (password) {
    data.password = await bcrypt.hash(password, 12);
  }

  // Non-admins cannot change role or status
  if (session.role !== "admin") {
    delete data.role;
    delete data.status;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    omit: { password: true },
  });

  return Response.json({ user });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await prisma.user.delete({ where: { id } });

  return Response.json({ success: true });
}
