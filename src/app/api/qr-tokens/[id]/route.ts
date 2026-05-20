import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/qr-tokens/[id]">) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const token = await prisma.qRToken.update({
    where: { id },
    data: body,
  });

  return Response.json({ token });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/qr-tokens/[id]">) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await prisma.qRToken.delete({ where: { id } });

  return Response.json({ success: true });
}
