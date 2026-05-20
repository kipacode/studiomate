"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAttendanceHistory, getUserActivities } from "@/lib/mock-data";
import type { ActivityLog, Attendance } from "@/lib/types";
import {
  cn,
  formatTime,
  formatDate,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  BarChart3,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────
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

// ─── Main Page ───────────────────────────────────────────
export default function HistoryPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    now.toISOString().slice(0, 10)
  );

  const attendanceHistory = useMemo(
    () => (user ? getAttendanceHistory(user.id) : []),
    [user]
  );

  const allActivities = useMemo(
    () => (user ? getUserActivities(user.id) : []),
    [user]
  );

  // Attendance for selected month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAttendance = useMemo(
    () => attendanceHistory.filter((r) => r.date.startsWith(monthStr)),
    [attendanceHistory, monthStr]
  );

  // Activities for selected date
  const dateActivities = useMemo(
    () => allActivities.filter((a) => a.date === selectedDate),
    [allActivities, selectedDate]
  );

  // Month stats
  const monthStats = useMemo(() => {
    const present = monthAttendance.filter(
      (r) => r.checkInTime && !r.isLate
    ).length;
    const late = monthAttendance.filter((r) => r.isLate).length;
    // Count working days in the month up to today
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
    const absent = Math.max(0, workingDays - totalPresent);
    return { present, late, absent };
  }, [monthAttendance, year, month]);

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0=Sun
    const days: {
      day: number;
      status: "present" | "late" | "absent" | "weekend" | "empty" | "future";
    }[] = [];

    // Empty cells before first day (adjust Sunday to end: Mon=0)
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
      if (!record) {
        days.push({ day: d, status: "absent" });
      } else if (record.isLate) {
        days.push({ day: d, status: "late" });
      } else {
        days.push({ day: d, status: "present" });
      }
    }

    return days;
  }, [year, month, monthAttendance]);

  // Activity tab summary
  const activitySummary = useMemo(() => {
    const totalTasks = dateActivities.length;
    const totalHours = dateActivities.reduce(
      (sum, a) => sum + a.estimatedHours,
      0
    );
    const categories: Record<string, number> = {};
    dateActivities.forEach((a) => {
      categories[a.category] = (categories[a.category] || 0) + 1;
    });
    return { totalTasks, totalHours, categories };
  }, [dateActivities]);

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View your attendance and activity history
        </p>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance" className="space-y-6 mt-4">
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

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
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
          <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
            <CardContent className="py-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (label) => (
                    <div
                      key={label}
                      className="text-center text-[10px] font-medium text-neutral-500 uppercase tracking-wider py-1"
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
              {/* Day cells */}
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
                      cell.status === "present" &&
                        "text-emerald-400 bg-emerald-500/[0.08]",
                      cell.status === "late" &&
                        "text-amber-400 bg-amber-500/[0.08]"
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
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-3 flex items-center gap-4 text-[10px] text-neutral-500 border-t border-white/[0.04] pt-3">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" /> Late
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
          <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
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
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime
                              ? formatTime(
                                  new Date(
                                    record.checkInTime
                                  ).toISOString()
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime
                              ? formatTime(
                                  new Date(
                                    record.checkOutTime
                                  ).toISOString()
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {getDuration(
                              record.checkInTime,
                              record.checkOutTime
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                record.isLate
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              )}
                            >
                              {record.isLate ? "Late" : "Present"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activities Tab ── */}
        <TabsContent value="activities" className="space-y-6 mt-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-neutral-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
              <CardContent className="py-3 text-center">
                <p className="text-xl font-semibold text-neutral-200 tabular-nums">
                  {activitySummary.totalTasks}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Tasks</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
              <CardContent className="py-3 text-center">
                <p className="text-xl font-semibold text-neutral-200 tabular-nums">
                  {activitySummary.totalHours}h
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Total Hours</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
              <CardContent className="py-3 text-center">
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {Object.entries(activitySummary.categories).length === 0 ? (
                    <span className="text-xs text-neutral-500">—</span>
                  ) : (
                    Object.entries(activitySummary.categories).map(
                      ([cat, count]) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className={cn(
                            "text-[9px] px-1",
                            getCategoryColor(cat as any)
                          )}
                        >
                          {getCategoryLabel(cat as any)} {count}
                        </Badge>
                      )
                    )
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Categories</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity List */}
          {dateActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-neutral-800/50 p-5 mb-4">
                <BarChart3 className="size-10 text-neutral-500" />
              </div>
              <h3 className="text-base font-medium text-neutral-300 mb-1">
                No activities on this day
              </h3>
              <p className="text-sm text-neutral-500">
                Select a different date to view activities.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dateActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]"
                >
                  <CardContent className="flex items-start gap-3 py-4">
                    {activity.status === "done" ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-neutral-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "text-sm font-medium",
                          activity.status === "done" &&
                            "line-through text-neutral-500"
                        )}
                      >
                        {activity.taskTitle}
                      </h3>
                      {activity.description && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5",
                            getCategoryColor(activity.category)
                          )}
                        >
                          {getCategoryLabel(activity.category)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5",
                            activity.status === "done"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-sky-500/10 text-sky-400"
                          )}
                        >
                          {activity.status === "done"
                            ? "Done"
                            : "In Progress"}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <Clock className="size-3" />
                          {activity.estimatedHours}h
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
