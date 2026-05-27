import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const SINGLETON_ID = "singleton";

const DEFAULTS = {
  weekStartDay: 2,
  workDays: "2,3,4,5,6",
  optionalWorkDays: "0,1",
  monthlyCountMode: "calendar",
  fixedMonthlyWorkdays: 22,
};

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const settings = await prisma.workdaySettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, ...DEFAULTS },
  });

  return Response.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { weekStartDay, workDays, optionalWorkDays, monthlyCountMode, fixedMonthlyWorkdays } = body;

  // Validate weekStartDay
  if (
    weekStartDay !== undefined &&
    (typeof weekStartDay !== "number" || weekStartDay < 0 || weekStartDay > 6)
  ) {
    return Response.json({ error: "weekStartDay must be 0–6" }, { status: 400 });
  }

  // Validate day lists (comma-separated ints 0-6)
  function validateDayList(value: string, label: string) {
    if (value === "") return true; // empty is allowed (no optional days)
    const days = String(value)
      .split(",")
      .map((d) => parseInt(d.trim()));
    if (days.some((d) => isNaN(d) || d < 0 || d > 6)) {
      return label;
    }
    return true;
  }

  if (workDays !== undefined) {
    const result = validateDayList(workDays, "workDays");
    if (result !== true) {
      return Response.json({ error: `${result} must be comma-separated numbers 0–6` }, { status: 400 });
    }
  }

  if (optionalWorkDays !== undefined) {
    const result = validateDayList(optionalWorkDays, "optionalWorkDays");
    if (result !== true) {
      return Response.json({ error: `${result} must be comma-separated numbers 0–6` }, { status: 400 });
    }
  }

  if (monthlyCountMode !== undefined && !["calendar", "fixed"].includes(monthlyCountMode)) {
    return Response.json({ error: "monthlyCountMode must be 'calendar' or 'fixed'" }, { status: 400 });
  }

  const settings = await prisma.workdaySettings.upsert({
    where: { id: SINGLETON_ID },
    update: {
      ...(weekStartDay !== undefined ? { weekStartDay } : {}),
      ...(workDays !== undefined ? { workDays: String(workDays) } : {}),
      ...(optionalWorkDays !== undefined ? { optionalWorkDays: String(optionalWorkDays) } : {}),
      ...(monthlyCountMode !== undefined ? { monthlyCountMode } : {}),
      ...(fixedMonthlyWorkdays !== undefined ? { fixedMonthlyWorkdays: Number(fixedMonthlyWorkdays) } : {}),
    },
    create: {
      id: SINGLETON_ID,
      weekStartDay: weekStartDay ?? DEFAULTS.weekStartDay,
      workDays: workDays ?? DEFAULTS.workDays,
      optionalWorkDays: optionalWorkDays ?? DEFAULTS.optionalWorkDays,
      monthlyCountMode: monthlyCountMode ?? DEFAULTS.monthlyCountMode,
      fixedMonthlyWorkdays: fixedMonthlyWorkdays ?? DEFAULTS.fixedMonthlyWorkdays,
    },
  });

  return Response.json({ settings });
}
