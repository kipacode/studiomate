"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserX, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoodAvatar } from "@/components/ui/mood-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  cn,
  formatTime,
  getStatusColor,
  getStatusLabel,
  getRoleColor,
  getRoleLabel,
} from "@/lib/utils";
import type { User } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  status?: string;
  user: User;
}

interface DashboardSummary {
  totalPresent: number;
  totalLeave: number;
  totalAbsent: number;
  totalLate: number;
  totalMembers: number;
}

interface WeeklyData {
  day: string;
  present: number;
  late: number;
}

type AttendanceStatus = "checked_in" | "late" | "checked_out" | "not_yet" | "leave";

function getStatus(record: AttendanceRecord | undefined): AttendanceStatus {
  if (record?.status === "leave") return "leave";
  if (!record || !record.checkInTime) return "not_yet";
  if (record.checkOutTime) return "checked_out";
  if (record.isLate) return "late";
  return "checked_in";
}

// ── Chart config ───────────────────────────────────────────────────

const chartConfig = {
  present: { label: "Present", color: "oklch(0.75 0.15 170)" },
  late: { label: "Late", color: "oklch(0.75 0.15 60)" },
};

// ── Dashboard Page ─────────────────────────────────────────────────

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalPresent: 0,
    totalLeave: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalMembers: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashRes, usersRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/users"),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setSummary(data.summary);
        setTodayAttendance(data.todayAttendance ?? []);
        setWeeklyData(data.weeklyData ?? []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        const members = (data.users as User[]).filter(
          (u) => u.role !== "admin" && u.role !== "freelancer" && u.status === "active"
        );
        setAllMembers(members);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when tab comes back into focus so mood avatars stay current
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [load]);

  // Build member rows — all active members, matched with today's attendance
  const memberRows = allMembers.map((member) => {
    const attendance = todayAttendance.find((a) => a.userId === member.id);
    const status = getStatus(attendance);
    return { member, attendance, status };
  });

  // Sort: present/late first, then not yet
  const statusOrder: Record<AttendanceStatus, number> = {
    checked_in: 0,
    late: 1,
    checked_out: 2,
    leave: 3,
    not_yet: 4,
  };
  memberRows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const summaryCards = [
    {
      label: "Present Today",
      value: summary.totalPresent,
      icon: Users,
      color: "bg-emerald-500/15 text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "On Leave",
      value: summary.totalLeave,
      icon: CalendarDays,
      color: "bg-indigo-500/15 text-indigo-400",
      iconBg: "bg-indigo-500/10",
    },
    {
      label: "Not Yet",
      value: summary.totalAbsent,
      icon: UserX,
      color: "bg-neutral-500/15 text-neutral-400",
      iconBg: "bg-neutral-500/10",
    },
    {
      label: "Late Today",
      value: summary.totalLate,
      icon: Clock,
      color: "bg-amber-500/15 text-amber-400",
      iconBg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-semibold animate-counter">
                    {loading ? "—" : card.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.label}
                  </p>
                </div>
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    card.iconBg
                  )}
                >
                  <card.icon
                    className={cn("h-5 w-5", card.color.split(" ")[1])}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Attendance Table */}
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Today&apos;s Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : memberRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No active members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  memberRows.map(({ member, attendance, status }) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MoodAvatar
                            mood={member.mood}
                            name={member.name}
                            className="size-7"
                          />
                          <span className="text-sm font-medium">
                            {member.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", getRoleColor(member.role))}
                        >
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {attendance?.checkInTime
                          ? formatTime(attendance.checkInTime)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", getStatusColor(status))}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Weekly Chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Weekly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                  width={30}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="present"
                  fill="oklch(0.75 0.15 170)"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="late"
                  fill="oklch(0.75 0.15 60)"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
