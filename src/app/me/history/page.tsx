"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn, formatTime, formatDate, isPresentStatus, isExcusedStatus, rawStatusLabel, rawStatusBadgeClass } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

function getMonthName(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function localDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDuration(checkIn: string | Date | null, checkOut: string | Date | null): string {
  if (!checkIn || !checkOut) return "—";
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  const diff = b - a;
  if (diff <= 0) return "—";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Work schedule settings (fetched once, defaults match WorkdaySettings seed)
  const [workDays, setWorkDays] = useState<number[]>([2, 3, 4, 5, 6]); // Tue–Sat
  const [optionalDays, setOptionalDays] = useState<number[]>([0, 1]);   // Sun, Mon
  const [daysOffDates, setDaysOffDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      fetch("/api/attendance").then((r) => r.json()),
      fetch("/api/settings/workday").then((r) => r.json()),
      fetch("/api/settings/days-off").then((r) => r.json()),
    ])
      .then(([attData, wData, doData]) => {
        if (attData.attendance) setAttendanceHistory(attData.attendance);
        if (wData.settings?.workDays) {
          setWorkDays(wData.settings.workDays.split(",").filter(Boolean).map(Number));
        }
        if (wData.settings?.optionalWorkDays) {
          setOptionalDays(
            wData.settings.optionalWorkDays.split(",").filter(Boolean).map(Number)
          );
        }
        if (doData.daysOff) {
          setDaysOffDates(new Set<string>(doData.daysOff.map((d: any) => d.date)));
        }
      })
      .catch((err) => console.error("Failed to fetch history data:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAttendance = useMemo(
    () => attendanceHistory.filter((r) => r.date.startsWith(monthStr)),
    [attendanceHistory, monthStr]
  );

  // ── Stats: respect effective start (hard floor) + correct schedule ──
  const monthStats = useMemo(() => {
    const monthFirstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    // Hard floor: internshipStart for interns, createdAt for everyone else.
    const effectiveStart = user?.internshipStart
      ?? (user?.createdAt ? user.createdAt.slice(0, 10) : monthFirstDay);
    const clampedFrom = effectiveStart > monthFirstDay ? effectiveStart : monthFirstDay;

    const today = new Date();
    const todayDateStr = localDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    const monthLastDay = localDateStr(year, month, getDaysInMonth(year, month));
    const effectiveTo = monthLastDay < todayDateStr ? monthLastDay : todayDateStr;

    // Count required workdays in [clampedFrom, effectiveTo]
    let workingDays = 0;
    const cursor = new Date(`${clampedFrom}T00:00:00`);
    const end = new Date(`${effectiveTo}T00:00:00`);
    while (cursor <= end) {
      const ds = localDateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (workDays.includes(cursor.getDay()) && !daysOffDates.has(ds)) workingDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // Tally records within the effective range.
    let present = 0, late = 0, leave = 0, offDayBonus = 0;
    for (const r of monthAttendance) {
      if (r.date < clampedFrom || r.date > effectiveTo) continue;
      const [y, m, d] = r.date.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const isAdminOff = daysOffDates.has(r.date);
      const isRequired = workDays.includes(dow) && !isAdminOff;

      if (isRequired) {
        if (isExcusedStatus(r.status)) {
          leave++;
        } else if (isPresentStatus(r.status)) {
          present++;
          if (r.isLate) late++;
        }
      } else if (isPresentStatus(r.status) && r.checkInTime) {
        // Worked on an off-day (weekly off or admin holiday) → counts as bonus.
        offDayBonus++;
      }
    }

    const absent = Math.max(0, workingDays - present - leave);
    // Surplus / minus = days physically worked minus required workdays in the
    // period (from internshipStart). Off-day work adds to it; missed/leave days
    // pull it down. Matches the admin Reports "Surplus/Minus" column.
    const surplus = present + offDayBonus - workingDays;
    return { present, late, absent, leave, surplus, workingDays };
  }, [monthAttendance, year, month, workDays, daysOffDates, user]);

  // ── Calendar: correct schedule + internshipStart floor ─────────────
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: {
      day: number;
      status: "present" | "late" | "absent" | "weekend" | "empty" | "future" | "leave";
    }[] = [];

    // Mon-first grid offset
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) {
      days.push({ day: 0, status: "empty" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const internStart = user?.internshipStart ?? null;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = localDateStr(year, month, d);
      const dayOfWeek = date.getDay();
      const isAdminOff = daysOffDates.has(dateStr);
      const isRequiredDay = workDays.includes(dayOfWeek) && !isAdminOff;

      // Before internship start → dim as "not yet started"
      if (internStart && dateStr < internStart) {
        days.push({ day: d, status: "future" });
        continue;
      }

      // Off-day (admin holiday or weekly day-off)
      if (!isRequiredDay) {
        // If they came in on an optional day, show as present (bonus)
        const record = monthAttendance.find((r) => r.date === dateStr);
        if (record && isPresentStatus(record.status) && record.checkInTime) {
          days.push({ day: d, status: "present" });
        } else {
          days.push({ day: d, status: "weekend" });
        }
        continue;
      }

      // Future required day
      if (date > today) {
        days.push({ day: d, status: "future" });
        continue;
      }

      // Past required workday
      const record = monthAttendance.find((r) => r.date === dateStr);
      if (!record || record.status === "alpha") {
        days.push({ day: d, status: "absent" });
      } else if (isExcusedStatus(record.status)) {
        days.push({ day: d, status: "leave" });
      } else if (record.isLate) {
        days.push({ day: d, status: "late" });
      } else {
        days.push({ day: d, status: "present" });
      }
    }

    return days;
  }, [year, month, monthAttendance, workDays, optionalDays, daysOffDates, user]);

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to continue.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View your attendance history
        </p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold">{getMonthName(year, month)}</h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in duration-300">
            <Card className="border-0 bg-emerald-500/[0.05] ring-1 ring-emerald-500/10">
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
                  {monthStats.present}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Present</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-amber-500/[0.05] ring-1 ring-amber-500/10">
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-semibold text-amber-400 tabular-nums">
                  {monthStats.late}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Late</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-indigo-500/[0.05] ring-1 ring-indigo-500/10">
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-semibold text-indigo-400 tabular-nums">
                  {monthStats.leave}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">On Leave</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-red-500/[0.05] ring-1 ring-red-500/10">
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-semibold text-red-400 tabular-nums">
                  {monthStats.absent}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Absent</p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                "border-0 ring-1 col-span-2 md:col-span-1",
                monthStats.surplus > 0
                  ? "bg-emerald-500/[0.05] ring-emerald-500/10"
                  : monthStats.surplus < 0
                    ? "bg-red-500/[0.05] ring-red-500/10"
                    : "bg-neutral-500/[0.05] ring-neutral-500/10"
              )}
            >
              <CardContent className="py-3 text-center">
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    monthStats.surplus > 0
                      ? "text-emerald-400"
                      : monthStats.surplus < 0
                        ? "text-red-400"
                        : "text-neutral-400"
                  )}
                >
                  {monthStats.surplus > 0 ? `+${monthStats.surplus}` : monthStats.surplus}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Surplus/Minus</p>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Grid */}
          <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04] animate-in fade-in duration-300">
            <CardContent className="py-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div
                    key={label}
                    className="text-center text-[10px] font-medium text-neutral-500 uppercase tracking-wider py-1"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      cell.status === "empty" && "invisible",
                      cell.status === "weekend" && "text-neutral-600",
                      cell.status === "future" && "text-neutral-600",
                      cell.status === "absent" && "text-neutral-400",
                      cell.status === "present" && "text-emerald-400 bg-emerald-500/[0.08]",
                      cell.status === "late" && "text-amber-400 bg-amber-500/[0.08]",
                      cell.status === "leave" && "text-indigo-400 bg-indigo-500/[0.08]"
                    )}
                  >
                    {cell.day > 0 && (
                      <>
                        <span>{cell.day}</span>
                        {cell.status === "present" && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-emerald-400" />
                        )}
                        {cell.status === "late" && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-amber-400" />
                        )}
                        {cell.status === "leave" && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-indigo-400" />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-neutral-500 border-t border-white/[0.04] pt-3">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" /> Late
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-indigo-500" /> On Leave
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-neutral-600" /> Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-neutral-800" /> Day Off
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Table */}
          <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04] animate-in fade-in duration-300">
            <CardHeader>
              <CardTitle className="text-sm">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {monthAttendance.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">
                  No attendance records for this month.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...monthAttendance]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime
                              ? formatTime(new Date(record.checkInTime).toISOString())
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime
                              ? formatTime(new Date(record.checkOutTime).toISOString())
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {getDuration(record.checkInTime, record.checkOutTime)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px]", rawStatusBadgeClass(record.status, record.isLate))}
                            >
                              {record.status === "check-in" || !record.status
                                ? record.isLate
                                  ? "Late"
                                  : "Present"
                                : rawStatusLabel(record.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
