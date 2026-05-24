"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import QRCode from "qrcode";
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
  QrCode,
  Upload,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<{
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    isLate: boolean;
    status?: string;
  } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<"check-in" | "leave">("check-in");
  const [registeringLeave, setRegisteringLeave] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showConfirmCheckOut, setShowConfirmCheckOut] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    fetch(`/api/attendance`)
      .then((r) => r.json())
      .then((d) => {
        if (d.attendance) setAttendanceHistory(d.attendance);
      })
      .catch(() => {});
  }, [user, todayAttendance]);

  useEffect(() => {
    if (user?.username) {
      QRCode.toDataURL(user.username, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err));
    }
  }, [user]);

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `${user?.username}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: "DASHBOARD", status: "check-in" }),
      });
      const d = await res.json();
      if (res.ok) {
        setTodayAttendance(d.attendance);
        toast.success("Successfully checked in for today");
      } else {
        toast.error(d.error || "Failed to check in");
      }
    } catch {
      toast.error("Failed to check in. Please try again.");
    }
    setCheckingIn(false);
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/attendance/checkout", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setTodayAttendance(d.attendance);
        setShowConfirmCheckOut(false);
      }
    } catch {}
    setCheckingOut(false);
  }

  async function handleRegisterLeave() {
    setRegisteringLeave(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "leave" }),
      });
      const d = await res.json();
      if (res.ok) {
        setTodayAttendance(d.attendance);
        toast.success("Successfully registered as On Leave for today");
      } else {
        toast.error(d.error || "Failed to register leave");
      }
    } catch {
      toast.error("Failed to register leave. Please try again.");
    }
    setRegisteringLeave(false);
  }

  const weekAttendance = useMemo(() => {
    if (!user) return [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
    monday.setHours(0, 0, 0, 0);

    const days: { label: string; status: "present" | "late" | "absent" | "future" | "leave" }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const record = attendanceHistory.find((r) => r.date === dateStr);

      let status: "present" | "late" | "absent" | "future" | "leave" = "absent";
      if (d > now) {
        status = "future";
      } else if (record) {
        status = record.status === "leave" ? "leave" : (record.isLate ? "late" : "present");
      }

      days.push({ label: labels[i], status });
    }
    return days;
  }, [user, attendanceHistory]);

  const monthStats = useMemo(() => {
    if (!user) return { present: 0, late: 0, leave: 0 };
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = attendanceHistory.filter((r) => r.date.startsWith(monthStr));

    return {
      present: monthRecords.filter((r) => r.status !== "leave" && r.checkInTime && !r.isLate).length,
      late: monthRecords.filter((r) => r.status !== "leave" && r.isLate).length,
      leave: monthRecords.filter((r) => r.status === "leave").length,
    };
  }, [user, attendanceHistory]);

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
                    todayAttendance?.status === "leave" && "bg-indigo-400",
                    todayAttendance?.status !== "leave" && isCheckedIn && !isLate && "bg-emerald-400",
                    todayAttendance?.status !== "leave" && isCheckedIn && isLate && "bg-amber-400",
                    todayAttendance?.status !== "leave" && isCheckedOut && "bg-sky-400",
                    todayAttendance?.status !== "leave" && !isCheckedIn && !isCheckedOut && "bg-neutral-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-3 w-3 rounded-full",
                    todayAttendance?.status === "leave" && "bg-indigo-500",
                    todayAttendance?.status !== "leave" && isCheckedIn && !isLate && "bg-emerald-500",
                    todayAttendance?.status !== "leave" && isCheckedIn && isLate && "bg-amber-500",
                    todayAttendance?.status !== "leave" && isCheckedOut && "bg-sky-500",
                    todayAttendance?.status !== "leave" && !isCheckedIn && !isCheckedOut && "bg-neutral-500",
                  )}
                />
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {todayAttendance?.status === "leave" && "You are On Leave Today"}
                {todayAttendance?.status !== "leave" && isCheckedOut && "Checked Out"}
                {todayAttendance?.status !== "leave" && isCheckedIn && !isLate && "You're Checked In"}
                {todayAttendance?.status !== "leave" && isCheckedIn && isLate && "Checked In (Late)"}
                {todayAttendance?.status !== "leave" && !isCheckedIn && !isCheckedOut && "Not Checked In Yet"}
              </h2>
              {todayAttendance?.status === "leave" ? (
                <p className="mt-1 text-sm text-neutral-400">
                  Your leave status has been registered for today.
                </p>
              ) : todayAttendance?.checkInTime ? (
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
            <div className="text-right">
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
            {todayAttendance?.status === "leave" ? (
              <Button variant="outline" size="lg" className="gap-2 border-indigo-500/20 text-indigo-400" disabled>
                On Leave
              </Button>
            ) : isCheckedOut ? (
              <Button variant="ghost" size="lg" className="gap-2" disabled>
                <LogOut className="size-4" />
                Checked Out
              </Button>
            ) : isCheckedIn ? (
              /* Desktop: inline confirmation (hidden on mobile) */
              <>
                <div className="hidden md:flex">
                  {showConfirmCheckOut ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-neutral-400 hover:text-neutral-200"
                        onClick={() => setShowConfirmCheckOut(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="gap-2"
                        onClick={handleCheckOut}
                        disabled={checkingOut}
                      >
                        <LogOut className="size-4" />
                        {checkingOut ? "Processing..." : "Confirm Check Out"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 hover:bg-neutral-800 transition-colors"
                      onClick={() => setShowConfirmCheckOut(true)}
                    >
                      <LogOut className="size-4" />
                      Check Out
                    </Button>
                  )}
                </div>
                {/* Mobile: always show the trigger button */}
                <div className="md:hidden">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 hover:bg-neutral-800 transition-colors"
                    onClick={() => setShowConfirmCheckOut(true)}
                  >
                    <LogOut className="size-4" />
                    Check Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="grid grid-cols-2 gap-1 bg-neutral-900/60 p-1 rounded-lg border border-white/[0.04] w-40">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("check-in")}
                    className={cn(
                      "py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                      selectedStatus === "check-in"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200"
                    )}
                  >
                    Check-in
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("leave")}
                    className={cn(
                      "py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                      selectedStatus === "leave"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200"
                    )}
                  >
                    On Leave
                  </button>
                </div>

                {selectedStatus === "check-in" ? (
                  <Button
                    size="lg"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                  >
                    <LogIn className="size-4" />
                    {checkingIn ? "Processing..." : "Check In"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                    onClick={handleRegisterLeave}
                    disabled={registeringLeave}
                  >
                    <CalendarPlus className="size-4" />
                    {registeringLeave ? "Processing..." : "Register Leave"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile Check-Out Confirmation Overlay ── */}
          {showConfirmCheckOut && isCheckedIn && (
            <div className="md:hidden absolute inset-0 z-10 flex items-end animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-[inherit]"
                onClick={() => setShowConfirmCheckOut(false)}
              />
              {/* Confirmation panel */}
              <div className="relative w-full rounded-b-[inherit] border-t border-white/10 bg-neutral-900/95 backdrop-blur-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-full bg-red-500/15 ring-1 ring-red-500/30">
                    <LogOut className="size-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Confirm Check Out</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      This action cannot be undone for today.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1 text-neutral-400 hover:text-neutral-200 border border-white/[0.06]"
                    onClick={() => setShowConfirmCheckOut(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                  >
                    <LogOut className="size-4" />
                    {checkingOut ? "Processing..." : "Check Out"}
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                      day.status === "leave" &&
                        "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30",
                      day.status === "future" &&
                        "bg-neutral-800/30 text-neutral-600 ring-1 ring-neutral-700/30"
                    )}
                  >
                    {day.status === "present" && "✓"}
                    {day.status === "late" && "!"}
                    {day.status === "absent" && "✕"}
                    {day.status === "leave" && "L"}
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
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-indigo-500" /> Leave
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
            <div className="grid grid-cols-3 gap-3">
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
              <div className="rounded-lg bg-indigo-500/[0.06] p-3 text-center ring-1 ring-indigo-500/10">
                <p className="text-lg font-semibold text-indigo-400 tabular-nums">
                  {monthStats.leave}
                </p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                  Leave
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Personal QR ID Card */}
        <Card className="relative overflow-hidden border border-white/[0.06] bg-neutral-950/40 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="size-4 text-emerald-400" />
                <CardTitle className="text-sm">Digital ID Card</CardTitle>
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                StudioMate Identity
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="relative group flex items-center justify-center bg-white p-3 rounded-xl shadow-lg border border-white/20 transition-all duration-300 hover:scale-105">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="My QR Code ID"
                  className="w-40 h-40 object-contain animate-fade-in"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-neutral-500">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-base font-semibold text-white tracking-tight">{user.name}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">@{user.username}</p>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-mono">
                ID: {user.id}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={downloadQRCode}
              className="gap-1.5 hover:bg-neutral-800 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 rotate-180" />
              Download QR Code File
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
