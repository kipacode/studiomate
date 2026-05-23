import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { qrContent, status } = body;

    if (!qrContent) {
      return Response.json({ error: "QR code content is required" }, { status: 400 });
    }

    if (status !== "check-in" && status !== "leave") {
      return Response.json({ error: "Valid status ('check-in' or 'leave') is required" }, { status: 400 });
    }

    // Find user by username or ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: qrContent },
          { id: qrContent }
        ],
        status: "active"
      }
    });

    if (!user) {
      return Response.json({ error: "User not found or account is inactive" }, { status: 401 });
    }

    // Create session for the logged-in user
    await createSession(user.id, user.role);

    // Automatically record attendance for today if they are NOT an admin (only employees/interns check in)
    if (user.role !== "admin") {
      const today = new Date().toISOString().split("T")[0];

      // Check if attendance already exists for today
      const existing = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          }
        }
      });

      if (!existing) {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setHours(8, 0, 0, 0);
        const isLate = now > cutoff;

        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: today,
            checkInTime: status === "check-in" ? now : null,
            qrTokenUsed: "QR-LOGIN",
            isLate: status === "check-in" ? isLate : false,
            status: status,
          }
        });
      } else {
        if (status === "check-in" && existing.status === "leave") {
          return Response.json({ error: "User is on leave today and cannot check in" }, { status: 400 });
        }

        // If record exists, update status. If checking in, set check-in time if empty.
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setHours(8, 0, 0, 0);
        const isLate = now > cutoff;

        await prisma.attendance.update({
          where: {
            id: existing.id
          },
          data: {
            status: status,
            ...(status === "check-in" && !existing.checkInTime ? {
              checkInTime: now,
              isLate: isLate,
            } : {}),
            ...(status === "leave" ? {
              checkInTime: null,
              isLate: false,
            } : {})
          }
        });
      }
    }

    const { password: _, ...safeUser } = user;
    return Response.json({ user: safeUser });
  } catch (error: any) {
    console.error("QR Login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
