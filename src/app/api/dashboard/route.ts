import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { isPresentStatus, isExcusedStatus } from "@/lib/utils";

export async function GET() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];
  const oneHourAgo = new Date(Date.now() - 3_600_000);

  const [totalMembers, todayAttendance, weeklyData] = await Promise.all([
    prisma.user.count({
      where: { status: "active", role: { not: "admin" }, NOT: { role: "freelancer" } },
    }),
    prisma.attendance.findMany({
      where: { date: today },
      include: { user: { omit: { password: true } } },
    }),
    (async () => {
      const days: { day: string; present: number; late: number }[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const records = await prisma.attendance.findMany({ where: { date: dateStr } });
        days.push({
          day: dayNames[d.getDay()],
          present: records.filter((r) => isPresentStatus(r.status)).length,
          late: records.filter((r) => isPresentStatus(r.status) && r.isLate).length,
        });
      }
      return days;
    })(),
  ]);

  const totalPresent = todayAttendance.filter((a) => isPresentStatus(a.status)).length;
  const totalLeave = todayAttendance.filter((a) => isExcusedStatus(a.status)).length;

  const summary = {
    totalPresent,
    totalLeave,
    // Absent = members with no record + unexcused (alpha) records.
    totalAbsent: totalMembers - totalPresent - totalLeave,
    totalLate: todayAttendance.filter((a) => isPresentStatus(a.status) && a.isLate).length,
    recentCheckIns: todayAttendance.filter(
      (a) => isPresentStatus(a.status) && a.checkInTime && new Date(a.checkInTime) >= oneHourAgo
    ).length,
    totalMembers,
  };

  return Response.json({ summary, todayAttendance, weeklyData });
}
