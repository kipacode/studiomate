"use client";

import { Users, UserX, Clock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  getDashboardSummary,
  getTodayAttendance,
  getActiveMembers,
  getAttendanceStatus,
  getWeeklyAttendanceCounts,
} from "@/lib/mock-data";
import {
  cn,
  formatTime,
  getStatusColor,
  getStatusLabel,
  getRoleColor,
  getRoleLabel,
  getInitials,
} from "@/lib/utils";

const chartConfig = {
  present: { label: "Present", color: "oklch(0.75 0.15 170)" },
  late: { label: "Late", color: "oklch(0.75 0.15 60)" },
};

export default function AdminDashboard() {
  const summary = getDashboardSummary();
  const todayAttendance = getTodayAttendance();
  const weeklyData = getWeeklyAttendanceCounts();
  const members = getActiveMembers().filter((u) => u.role !== "freelancer");

  const summaryCards = [
    {
      label: "Present Today",
      value: summary.totalPresent,
      icon: Users,
      color: "bg-emerald-500/15 text-emerald-400",
      iconBg: "bg-emerald-500/10",
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
    {
      label: "Recent Check-ins",
      value: summary.recentCheckIns,
      icon: Activity,
      color: "bg-sky-500/15 text-sky-400",
      iconBg: "bg-sky-500/10",
    },
  ];

  // Build member attendance list
  const memberRows = members.map((member) => {
    const attendance = todayAttendance.find((a) => a.userId === member.id);
    const status = getAttendanceStatus(member.id);
    return { member, attendance, status };
  });

  // Sort: present first, then not yet
  memberRows.sort((a, b) => {
    const order = { checked_in: 0, late: 1, checked_out: 2, not_yet: 3 };
    return order[a.status] - order[b.status];
  });

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
                    {card.value}
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
                {memberRows.map(({ member, attendance, status }) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-muted">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          getRoleColor(member.role)
                        )}
                      >
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {attendance ? formatTime(attendance.checkInTime) : "—"}
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
                ))}
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
