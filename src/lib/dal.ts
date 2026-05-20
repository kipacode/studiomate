import "server-only";
import { cache } from "react";
import { getSession } from "./session";
import { prisma } from "./prisma";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  try {
    return await prisma.user.findUnique({
      where: { id: session.userId },
      omit: { password: true },
    });
  } catch {
    return null;
  }
});
