"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getAttendanceHistory } from "@/lib/mock-data";
import {
  cn,
  formatTime,
  formatDate,
  getInternProgress,
  getInternDaysRemaining,
} from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

import {
  LogIn,
  LogOut,
  CalendarDays,
  Timer,
  GraduationCap,
} from "lucide-react";

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<{
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    isLate: boolean;
  } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/attendance?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        const record = d.attendance?.[0];
        if (record) setTodayAttendance(record);
      })
      .catch(() => {});
  }, [user]);

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/attendance/checkout", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setTodayAttendance(d.attendance);
      }
    } catch {}
    setCheckingOut(false);
  }

  const weekAttendance = useMemo(() => {
    if (!user) return [];
    const history = getAttendanceHistory(user.id);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
    monday.setHours(0, 0, 0, 0);

    const days: { label: string; status: "present" | "late" | "absent" | "future" }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const record = history.find((r) => r.date === dateStr);

      let status: "present" | "late" | "absent" | "future" = "absent";
      if (d > now) {
        status = "future";
      } else if (record) {
        status = record.isLate ? "late" : "present";
      }

      days.push({ label: labels[i], status });
    }
    return days;
  }, [user]);

  const monthStats = useMemo(() => {
    if (!user) return { present: 0, late: 0 };
    const history = getAttendanceHistory(user.id);
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = history.filter((r) => r.date.startsWith(monthStr));

    return {
      present: monthRecords.filter((r) => r.checkInTime && !r.isLate).length,
      late: monthRecords.filter((r) => r.isLate).length,
    };
  }, [user]);

  function getDurationSinceCheckIn(): string {
    if (!todayAttendance?.checkInTime) return "";
    const checkIn = new Date(todayAttendance.checkInTime);
    const diff = currentTime.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  const isCheckedIn = !!todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const isCheckedOut = !!todayAttendance?.checkOutTime;
  const isLate = todayAttendance?.isLate ?? false;
  const isIntern = user.role === "intern";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* ── Check-in Status Card ── */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-neutral-800/40 backdrop-blur-xl ring-1 ring-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
        <CardContent className="relative flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1.5">
              <span className="relative flex h-3 w-3">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    isCheckedIn && !isLate && "bg-emerald-400",
                    isCheckedIn && isLate && "bg-amber-400",
                    isCheckedOut && "bg-sky-400",
                    !isCheckedIn && !isCheckedOut && "bg-neutral-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-3 w-3 rounded-full",
                    isCheckedIn && !isLate && "bg-emerald-500",
                    isCheckedIn && isLate && "bg-amber-500",
                    isCheckedOut && "bg-sky-500",
                    !isCheckedIn && !isCheckedOut && "bg-neutral-500",
                  )}
                />
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {isCheckedOut && "Checked Out"}
                {isCheckedIn && !isLate && "You're Checked In"}
                {isCheckedIn && isLate && "Checked In (Late)"}
                {!isCheckedIn && !isCheckedOut && "Not Checked In Yet"}
              </h2>
              {todayAttendance?.checkInTime ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm text-neutral-400">
                    Check-in time:{" "}
                    <span className="font-medium text-neutral-200">
                      {formatTime(new Date(todayAttendance.checkInTime).toISOString())}
                    </span>
                  </p>
                  {isCheckedIn && (
                    <p className="text-sm text-neutral-400">
                      Duration:{" "}
                      <span className="font-medium text-neutral-200">
                        {getDurationSinceCheckIn()}
                      </span>
                    </p>
                  )}
                  {todayAttendance.checkOutTime && (
                    <p className="text-sm text-neutral-400">
                      Check-out:{" "}
                      <span className="font-medium text-neutral-200">
                        {formatTime(new Date(todayAttendance.checkOutTime).toISOString())}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-neutral-400">
                  Scan QR code or check in manually
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                Current Time
              </p>
              <p className="text-lg font-mono font-medium text-neutral-200 tabular-nums">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
            {isCheckedOut ? (
              <Button variant="ghost" size="lg" className="gap-2" disabled>
                <LogOut className="size-4" />
                Checked Out
              </Button>
            ) : isCheckedIn ? (
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={handleCheckOut}
                disabled={checkingOut}
              >
                <LogOut className="size-4" />
                {checkingOut ? "Processing..." : "Check Out"}
              </Button>
            ) : (
              <Button size="lg" className="gap-2">
                <Link href="/check-in" className="flex items-center gap-2">
                  <LogIn className="size-4" />
                  Check In
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="space-y-4">
        {/* Internship Progress */}
        {isIntern && user.internshipStart && user.internshipEnd && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-amber-400" />
                <CardTitle className="text-sm">Internship Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress
                value={getInternProgress(
                  String(user.internshipStart),
                  String(user.internshipEnd)
                )}
              >
                <ProgressLabel className="text-xs text-neutral-400">
                  Progress
                </ProgressLabel>
                <ProgressValue className="text-xs" />
              </Progress>
              <p className="text-sm text-amber-400/80 font-medium">
                {getInternDaysRemaining(String(user.internshipEnd))} days remaining
              </p>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Start: {formatDate(String(user.internshipStart))}</span>
                <span>End: {formatDate(String(user.internshipEnd))}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-sky-400" />
              <CardTitle className="text-sm">This Week</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              {weekAttendance.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-neutral-500 uppercase">
                    {day.label}
                  </span>
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                      day.status === "present" &&
                        "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
                      day.status === "late" &&
                        "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
                      day.status === "absent" &&
                        "bg-neutral-800/50 text-neutral-500 ring-1 ring-neutral-700/50",
                      day.status === "future" &&
                        "bg-neutral-800/30 text-neutral-600 ring-1 ring-neutral-700/30"
                    )}
                  >
                    {day.status === "present" && "✓"}
                    {day.status === "late" && "!"}
                    {day.status === "absent" && "✕"}
                    {day.status === "future" && "·"}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" /> Late
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-neutral-600" /> Absent
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Month Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-violet-400" />
              <CardTitle className="text-sm">This Month</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/[0.06] p-3 text-center ring-1 ring-emerald-500/10">
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">
                  {monthStats.present}
                </p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                  Present
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/[0.06] p-3 text-center ring-1 ring-amber-500/10">
                <p className="text-lg font-semibold text-amber-400 tabular-nums">
                  {monthStats.late}
                </p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                  Late
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
