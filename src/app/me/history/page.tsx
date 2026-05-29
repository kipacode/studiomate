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

// Fixed warning: formatTime wants string or null, so we handle conversion to string.
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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((d) => {
        if (d.attendance) {
          setAttendanceHistory(d.attendance);
        }
      })
      .catch((err) => console.error("Failed to fetch attendance history:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAttendance = useMemo(
    () => attendanceHistory.filter((r) => r.date.startsWith(monthStr)),
    [attendanceHistory, monthStr]
  );

  const monthStats = useMemo(() => {
    const present = monthAttendance.filter((r) => isPresentStatus(r.status) && !r.isLate).length;
    const late = monthAttendance.filter((r) => isPresentStatus(r.status) && r.isLate).length;
    const leave = monthAttendance.filter((r) => isExcusedStatus(r.status)).length;
    const daysInMonth = getDaysInMonth(year, month);
    let workingDays = 0;
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > today) break;
      const day = date.getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }
    const totalPresent = present + late;
    const absent = Math.max(0, workingDays - totalPresent - leave);
    return { present, late, absent, leave };
  }, [monthAttendance, year, month]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: {
      day: number;
      status: "present" | "late" | "absent" | "weekend" | "empty" | "future" | "leave";
    }[] = [];

    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) {
      days.push({ day: 0, status: "empty" });
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        days.push({ day: d, status: "weekend" });
        continue;
      }

      if (date > today) {
        days.push({ day: d, status: "future" });
        continue;
      }

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
  }, [year, month, monthAttendance]);

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-300">
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
                  <span className="size-2 rounded-full bg-neutral-800" /> Weekend
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
