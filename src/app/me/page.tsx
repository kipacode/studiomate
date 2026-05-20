"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getAttendanceStatus,
  getUserActivities,
  mockAttendance,
  getAttendanceHistory,
  activityCategories,
} from "@/lib/mock-data";
import type { ActivityLog, ActivityCategory, ActivityStatus } from "@/lib/types";
import {
  cn,
  todayStr,
  formatTime,
  formatDate,
  getCategoryColor,
  getCategoryLabel,
  getInternProgress,
  getInternDaysRemaining,
} from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Clock,
  LogIn,
  LogOut,
  Plus,
  CheckCircle2,
  Circle,
  CalendarDays,
  ListTodo,
  Timer,
  GraduationCap,
} from "lucide-react";

// ─── Add Task Dialog ─────────────────────────────────────
interface TaskFormData {
  taskTitle: string;
  category: ActivityCategory;
  description: string;
  estimatedHours: number;
  status: ActivityStatus;
}

const defaultForm: TaskFormData = {
  taskTitle: "",
  category: "design",
  description: "",
  estimatedHours: 1,
  status: "in_progress",
};

function AddTaskDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: TaskFormData) => void;
}) {
  const [form, setForm] = useState<TaskFormData>(defaultForm);

  function handleSave() {
    if (!form.taskTitle.trim()) return;
    onSave(form);
    setForm(defaultForm);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Log a new activity for today.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="taskTitle">Task Title *</Label>
            <Input
              id="taskTitle"
              placeholder="e.g. Landing page redesign"
              value={form.taskTitle}
              onChange={(e) => setForm({ ...form, taskTitle: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(val) =>
                setForm({ ...form, category: val as ActivityCategory })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {activityCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hours">Estimated Hours</Label>
              <Input
                id="hours"
                type="number"
                min={0.5}
                step={0.5}
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm({ ...form, estimatedHours: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setForm({ ...form, status: val as ActivityStatus })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.taskTitle.trim()}>
            Save Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ──────────────────────────────────────
export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localTasks, setLocalTasks] = useState<ActivityLog[]>([]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load user's activities for today
  useEffect(() => {
    if (user) {
      const activities = getUserActivities(user.id, todayStr());
      setLocalTasks(activities);
    }
  }, [user]);

  const attendanceStatus = user ? getAttendanceStatus(user.id) : "not_yet";
  const todayRecord = useMemo(() => {
    if (!user) return null;
    const today = todayStr();
    return mockAttendance.find((r) => r.userId === user.id && r.date === today) || null;
  }, [user]);

  // Weekly attendance (Mon-Fri of this week)
  const weekAttendance = useMemo(() => {
    if (!user) return [];
    const history = getAttendanceHistory(user.id);
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
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

  // This month stats
  const monthStats = useMemo(() => {
    if (!user) return { present: 0, late: 0, tasksCompleted: 0 };
    const history = getAttendanceHistory(user.id);
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = history.filter((r) => r.date.startsWith(monthStr));
    const activities = getUserActivities(user.id);
    const monthActivities = activities.filter((a) => a.date.startsWith(monthStr));

    return {
      present: monthRecords.filter((r) => r.checkInTime && !r.isLate).length,
      late: monthRecords.filter((r) => r.isLate).length,
      tasksCompleted: monthActivities.filter((a) => a.status === "done").length,
    };
  }, [user]);

  function handleAddTask(data: TaskFormData) {
    const newTask: ActivityLog = {
      id: `local-${Date.now()}`,
      userId: user?.id || "",
      date: todayStr(),
      taskTitle: data.taskTitle,
      category: data.category,
      description: data.description || undefined,
      status: data.status,
      estimatedHours: data.estimatedHours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalTasks((prev) => [newTask, ...prev]);
  }

  function getDurationSinceCheckIn(): string {
    if (!todayRecord?.checkInTime) return "";
    const checkIn = new Date(todayRecord.checkInTime);
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

  const isCheckedIn = attendanceStatus === "checked_in" || attendanceStatus === "late";
  const isLate = attendanceStatus === "late";
  const isIntern = user.role === "intern";
  const todaysTasks = localTasks;
  const doneTasks = todaysTasks.filter((t) => t.status === "done").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* ── Check-in Status Card ── */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-neutral-800/40 backdrop-blur-xl ring-1 ring-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
        <CardContent className="relative flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {/* Pulsing dot */}
            <div className="mt-1.5">
              <span
                className={cn(
                  "relative flex h-3 w-3",
                )}
              >
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    isCheckedIn && !isLate && "bg-emerald-400",
                    isLate && "bg-amber-400",
                    !isCheckedIn && "bg-neutral-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-3 w-3 rounded-full",
                    isCheckedIn && !isLate && "bg-emerald-500",
                    isLate && "bg-amber-500",
                    !isCheckedIn && "bg-neutral-500",
                  )}
                />
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {isCheckedIn && !isLate && "You're Checked In"}
                {isLate && "Checked In (Late)"}
                {!isCheckedIn && "Not Checked In Yet"}
              </h2>
              {isCheckedIn ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm text-neutral-400">
                    Check-in time:{" "}
                    <span className="font-medium text-neutral-200">
                      {todayRecord?.checkInTime
                        ? formatTime(
                            new Date(todayRecord.checkInTime).toISOString()
                          )
                        : "—"}
                    </span>
                  </p>
                  <p className="text-sm text-neutral-400">
                    Duration:{" "}
                    <span className="font-medium text-neutral-200">
                      {getDurationSinceCheckIn()}
                    </span>
                  </p>
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
            {isCheckedIn ? (
              <Button variant="outline" size="lg" className="gap-2">
                <Link href="/check-in" className="flex items-center gap-2">
                  <LogOut className="size-4" />
                  Check Out
                </Link>
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

      {/* ── Two Column Layout ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Left: Today's Tasks ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Today&apos;s Activity</CardTitle>
              <Badge variant="secondary" className="tabular-nums">
                {todaysTasks.length}
              </Badge>
            </div>
            <CardAction>
              <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="size-3.5" />
                Add Task
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-neutral-800/50 p-4 mb-3">
                  <ListTodo className="size-8 text-neutral-500" />
                </div>
                <p className="text-sm font-medium text-neutral-400">
                  No activities logged yet today
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Click &ldquo;Add Task&rdquo; to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-neutral-900/40 px-3.5 py-3 transition-colors hover:bg-neutral-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {task.status === "done" ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-neutral-500" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            task.status === "done" &&
                              "line-through text-neutral-500"
                          )}
                        >
                          {task.taskTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5",
                          getCategoryColor(task.category)
                        )}
                      >
                        {getCategoryLabel(task.category)}
                      </Badge>
                      <span className="text-xs text-neutral-500 tabular-nums w-10 text-right">
                        {task.estimatedHours}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right: Quick Stats ── */}
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
                  <span>
                    Start: {formatDate(String(user.internshipStart))}
                  </span>
                  <span>
                    End: {formatDate(String(user.internshipEnd))}
                  </span>
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
                <div className="rounded-lg bg-sky-500/[0.06] p-3 text-center ring-1 ring-sky-500/10">
                  <p className="text-lg font-semibold text-sky-400 tabular-nums">
                    {monthStats.tasksCompleted}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                    Done
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddTask}
      />
    </div>
  );
}
