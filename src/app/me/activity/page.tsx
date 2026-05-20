"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getUserActivities, activityCategories } from "@/lib/mock-data";
import type { ActivityLog, ActivityCategory, ActivityStatus } from "@/lib/types";
import {
  cn,
  todayStr,
  formatTime,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Plus,
  Pencil,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  ListTodo,
} from "lucide-react";

// ─── Form Data ───────────────────────────────────────────
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

// ─── Add / Edit Dialog ───────────────────────────────────
function TaskDialog({
  open,
  onOpenChange,
  onSave,
  initial,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TaskFormData) => void;
  initial?: TaskFormData;
  mode: "add" | "edit";
}) {
  const [form, setForm] = useState<TaskFormData>(initial || defaultForm);

  useEffect(() => {
    if (open) {
      setForm(initial || defaultForm);
    }
  }, [open, initial]);

  function handleSave() {
    if (!form.taskTitle.trim()) return;
    onSave(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Activity" : "Edit Activity"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Log a new activity for today."
              : "Update this activity."}
          </DialogDescription>
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
                  setForm({
                    ...form,
                    estimatedHours: parseFloat(e.target.value) || 0,
                  })
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
            {mode === "add" ? "Add Activity" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter tab categories ────────────────────────────────
const filterCategories: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...activityCategories,
];

// ─── Main Page ────────────────────────────────────────────
export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null);

  useEffect(() => {
    if (user) {
      const data = getUserActivities(user.id, todayStr());
      setActivities(data);
    }
  }, [user]);

  const filteredActivities =
    activeFilter === "all"
      ? activities
      : activities.filter((a) => a.category === activeFilter);

  function handleAdd(data: TaskFormData) {
    const newActivity: ActivityLog = {
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
    setActivities((prev) => [newActivity, ...prev]);
  }

  function handleEdit(data: TaskFormData) {
    if (!editingActivity) return;
    setActivities((prev) =>
      prev.map((a) =>
        a.id === editingActivity.id
          ? {
              ...a,
              taskTitle: data.taskTitle,
              category: data.category,
              description: data.description || undefined,
              status: data.status,
              estimatedHours: data.estimatedHours,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
    setEditingActivity(null);
  }

  function toggleStatus(id: string) {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "done" ? "in_progress" : "done",
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to continue.</p>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" />
          Add Activity
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterCategories.map((cat) => (
          <Button
            key={cat.value}
            variant={activeFilter === cat.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs transition-all",
              activeFilter === cat.value && cat.value !== "all" && getCategoryColor(cat.value as ActivityCategory),
            )}
            onClick={() => setActiveFilter(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-neutral-800/50 p-5 mb-4">
            <FileText className="size-10 text-neutral-500" />
          </div>
          <h3 className="text-base font-medium text-neutral-300 mb-1">
            No activities found
          </h3>
          <p className="text-sm text-neutral-500 max-w-xs">
            {activeFilter === "all"
              ? "You haven't logged any activities today. Click 'Add Activity' to start."
              : `No ${activeFilter} activities today.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className="group border-0 bg-neutral-900/50 ring-1 ring-white/[0.04] transition-all hover:ring-white/[0.08]"
            >
              <CardContent className="flex items-start gap-4 py-4">
                {/* Status Toggle */}
                <button
                  onClick={() => toggleStatus(activity.id)}
                  className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                  title={
                    activity.status === "done"
                      ? "Mark as in progress"
                      : "Mark as done"
                  }
                >
                  {activity.status === "done" ? (
                    <CheckCircle2 className="size-5 text-emerald-400" />
                  ) : (
                    <Circle className="size-5 text-neutral-500 hover:text-neutral-300" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
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
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => {
                        setEditingActivity(activity);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
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
                      {activity.status === "done" ? "Done" : "In Progress"}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <Clock className="size-3" />
                      {activity.estimatedHours}h
                    </span>
                    <span className="text-[11px] text-neutral-600">
                      {formatTime(
                        typeof activity.createdAt === "string"
                          ? activity.createdAt
                          : new Date(activity.createdAt).toISOString()
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAdd}
        mode="add"
      />

      {/* Edit Dialog */}
      <TaskDialog
        open={!!editingActivity}
        onOpenChange={(open) => {
          if (!open) setEditingActivity(null);
        }}
        onSave={handleEdit}
        mode="edit"
        initial={
          editingActivity
            ? {
                taskTitle: editingActivity.taskTitle,
                category: editingActivity.category,
                description: editingActivity.description || "",
                estimatedHours: editingActivity.estimatedHours,
                status: editingActivity.status,
              }
            : undefined
        }
      />
    </div>
  );
}
