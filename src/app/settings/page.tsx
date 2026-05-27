"use client";

import { useState, useEffect } from "react";
import { MapPin, Pencil, Plus, Trash2, CalendarDays, CalendarOff, Hash, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Location, WorkdaySettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

// ── Location Settings ─────────────────────────────────────────────────

function LocationTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    lat: 0,
    lng: 0,
    radiusMeters: 100,
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations.filter((l: any) => l.isActive));
      }
    } catch (err) {
      toast.error("Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditLocation(null);
    setFormData({
      label: "",
      address: "",
      lat: 0,
      lng: 0,
      radiusMeters: 100,
    });
    setDialogOpen(true);
  }

  function openEditDialog(loc: Location) {
    setEditLocation(loc);
    setFormData({
      label: loc.label,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      radiusMeters: loc.radiusMeters,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.label || !formData.address) {
      toast.error("Name and address are required");
      return;
    }

    try {
      const isEditing = !!editLocation;
      const url = isEditing ? `/api/locations/${editLocation.id}` : "/api/locations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save location");

      toast.success(isEditing ? "Location updated" : "Location created");
      setDialogOpen(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete location");
      
      toast.success("Location deleted");
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading locations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Office Locations</h2>
          <p className="text-sm text-muted-foreground">
            Manage physical studio locations for check-in
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <Card key={loc.id} className="relative overflow-hidden group">
            <CardContent className="p-0">
              <div className="h-32 relative bg-muted/30">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                </div>
                {/* Decorative grid lines */}
                <div className="absolute inset-0 opacity-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute w-full border-t border-foreground"
                      style={{ top: `${(i + 1) * 20}%` }}
                    />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute h-full border-l border-foreground"
                      style={{ left: `${(i + 1) * 10}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="p-5 border-t border-white/[0.04] bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{loc.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-[200px]">
                      {loc.address}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {loc.radiusMeters}m radius
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs font-mono text-muted-foreground">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(loc)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => handleDelete(loc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {locations.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground text-sm border border-dashed border-white/[0.1] rounded-xl">
            No locations found. Add one to get started.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={formData.label}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Studio A"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.lat}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      lat: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.lng}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      lng: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Radius (meters)</Label>
              <Input
                type="number"
                value={formData.radiusMeters}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    radiusMeters: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editLocation ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Workday Settings ────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_START_OPTIONS = [
  { value: 2, label: "Tuesday" },
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
  { value: 6, label: "Saturday" },
];

function WorkdayTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [settings, setSettings] = useState<WorkdaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [weekStartDay, setWeekStartDay] = useState(2);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [optionalDays, setOptionalDays] = useState<number[]>([1]);
  const [monthlyCountMode, setMonthlyCountMode] = useState<"calendar" | "fixed">("calendar");
  const [fixedMonthlyWorkdays, setFixedMonthlyWorkdays] = useState(22);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings/workday");
      const data = await res.json();
      if (res.ok) {
        applySettings(data.settings);
      }
    } catch {
      toast.error("Failed to load workday settings");
    } finally {
      setLoading(false);
    }
  }

  function applySettings(s: WorkdaySettings) {
    setSettings(s);
    setWeekStartDay(s.weekStartDay);
    setSelectedDays(s.workDays.split(",").filter(Boolean).map(Number));
    setOptionalDays(s.optionalWorkDays ? s.optionalWorkDays.split(",").filter(Boolean).map(Number) : []);
    setMonthlyCountMode(s.monthlyCountMode as "calendar" | "fixed");
    setFixedMonthlyWorkdays(s.fixedMonthlyWorkdays);
  }

  function toggleDay(day: number) {
    if (!isAdmin) return;
    // If it's currently optional, remove from optional first
    if (optionalDays.includes(day)) {
      setOptionalDays((prev) => prev.filter((d) => d !== day));
    }
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function toggleOptionalDay(day: number) {
    if (!isAdmin) return;
    // If it's currently required, remove from required first
    if (selectedDays.includes(day)) {
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    }
    setOptionalDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  /** Get day status: "required" | "optional" | "off" */
  function getDayStatus(day: number): "required" | "optional" | "off" {
    if (selectedDays.includes(day)) return "required";
    if (optionalDays.includes(day)) return "optional";
    return "off";
  }

  /** Cycle through states: off → required → optional → off */
  function cycleDay(day: number) {
    if (!isAdmin) return;
    const status = getDayStatus(day);
    if (status === "off") {
      // → required
      setSelectedDays((prev) => [...prev, day].sort());
    } else if (status === "required") {
      // → optional
      setSelectedDays((prev) => prev.filter((d) => d !== day));
      setOptionalDays((prev) => [...prev, day].sort());
    } else {
      // → off
      setOptionalDays((prev) => prev.filter((d) => d !== day));
    }
  }

  /** Preview: count how many required work days fall in the current month */
  function previewCalendarCount(): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (selectedDays.includes(dow)) count++;
    }
    return count;
  }

  async function handleSave() {
    if (selectedDays.length === 0) {
      toast.error("Select at least one required work day");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/workday", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDay,
          workDays: selectedDays.join(","),
          optionalWorkDays: optionalDays.join(","),
          monthlyCountMode,
          fixedMonthlyWorkdays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      applySettings(data.settings);
      toast.success("Workday settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading workday settings…</div>;
  }

  const calendarPreview = previewCalendarCount();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Workday Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which days count as work days and how monthly totals are calculated
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Work Days */}
        <Card className="border-white/[0.06] bg-card/60 lg:col-span-2">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Work Days</p>
                <p className="text-xs text-muted-foreground">
                  Click to cycle: <span className="text-muted-foreground/70">Off</span> → <span className="text-primary">Required</span> → <span className="text-amber-400">Optional</span> → <span className="text-muted-foreground/70">Off</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((label, idx) => {
                const status = getDayStatus(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => cycleDay(idx)}
                    disabled={!isAdmin}
                    className={[
                      "h-12 w-12 rounded-xl text-xs font-semibold border transition-all duration-150 flex flex-col items-center justify-center gap-0.5",
                      status === "required"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                        : status === "optional"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10"
                        : "bg-muted/40 text-muted-foreground border-white/[0.06] hover:border-white/20",
                      !isAdmin ? "cursor-default opacity-70" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span>{label}</span>
                    {status === "optional" && (
                      <span className="text-[8px] leading-none opacity-80">opt</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend / Summary */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                <span className="text-muted-foreground">
                  Required: {selectedDays.map((d) => DAY_LABELS[d]).join(", ") || "None"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" />
                <span className="text-muted-foreground">
                  Optional: {optionalDays.length > 0 ? optionalDays.map((d) => DAY_LABELS[d]).join(", ") : "None"}
                </span>
              </div>
            </div>

            {optionalDays.length > 0 && (
              <p className="text-xs text-amber-400/70 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                💡 Optional days count toward attendance when someone works, but won&apos;t be counted as absent if skipped.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Week Start Day */}
        <Card className="border-white/[0.06] bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Week Starts On</p>
                <p className="text-xs text-muted-foreground">Used for weekly attendance reports</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {WEEK_START_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => isAdmin && setWeekStartDay(opt.value)}
                  disabled={!isAdmin}
                  className={[
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-all duration-150",
                    weekStartDay === opt.value
                      ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                      : "bg-muted/40 text-muted-foreground border-white/[0.06] hover:border-white/20",
                    !isAdmin ? "cursor-default opacity-70" : "cursor-pointer",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Count Mode */}
        <Card className="border-white/[0.06] bg-card/60">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Hash className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Monthly Workday Count</p>
                <p className="text-xs text-muted-foreground">
                  How total work days per month are calculated
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Calendar mode */}
              <button
                onClick={() => isAdmin && setMonthlyCountMode("calendar")}
                disabled={!isAdmin}
                className={[
                  "w-full text-left p-3.5 rounded-xl border transition-all duration-150 space-y-1",
                  monthlyCountMode === "calendar"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-muted/30 border-white/[0.06] hover:border-white/20",
                  !isAdmin ? "cursor-default opacity-70" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Calendar-based</p>
                  {monthlyCountMode === "calendar" && (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Count required work days in each month dynamically
                </p>
                {monthlyCountMode === "calendar" && (
                  <p className="text-xs font-mono text-emerald-400 mt-1">
                    This month: {calendarPreview} required days
                  </p>
                )}
              </button>

              {/* Fixed mode */}
              <button
                onClick={() => isAdmin && setMonthlyCountMode("fixed")}
                disabled={!isAdmin}
                className={[
                  "w-full text-left p-3.5 rounded-xl border transition-all duration-150 space-y-1",
                  monthlyCountMode === "fixed"
                    ? "bg-sky-500/10 border-sky-500/30"
                    : "bg-muted/30 border-white/[0.06] hover:border-white/20",
                  !isAdmin ? "cursor-default opacity-70" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Fixed number</p>
                  {monthlyCountMode === "fixed" && (
                    <Badge className="text-[10px] bg-sky-500/15 text-sky-400 border-sky-500/20">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use a fixed number every month
                </p>
              </button>
            </div>

            {monthlyCountMode === "fixed" && isAdmin && (
              <div className="flex items-center gap-3 max-w-xs">
                <Label className="shrink-0 text-sm">Fixed count</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={fixedMonthlyWorkdays}
                  onChange={(e) => setFixedMonthlyWorkdays(parseInt(e.target.value) || 1)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">days / month</span>
              </div>
            )}

            {monthlyCountMode === "fixed" && !isAdmin && (
              <p className="text-sm font-mono text-sky-400">
                Fixed: {settings?.fixedMonthlyWorkdays ?? fixedMonthlyWorkdays} days / month
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Workday Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Days Off Settings ────────────────────────────────────────────────

interface DayOff {
  id: string;
  date: string;
  label: string | null;
  createdAt: string;
}

function DaysOffTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // View by month
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);

  useEffect(() => {
    fetchDaysOff();
  }, [viewYear, viewMonth]);

  async function fetchDaysOff() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(viewYear),
        month: String(viewMonth),
      });
      const res = await fetch(`/api/settings/days-off?${params}`);
      const data = await res.json();
      if (res.ok) setDaysOff(data.daysOff);
    } catch {
      toast.error("Failed to load days off");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newDate) {
      toast.error("Please select a date");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/settings/days-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, label: newLabel || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success(`Day off added: ${newDate}`);
      setNewDate("");
      setNewLabel("");
      fetchDaysOff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string, date: string) {
    try {
      const res = await fetch(`/api/settings/days-off/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Removed day off: ${date}`);
      setDaysOff((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Days Off</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mark specific dates as days off (holidays, closures). These dates won&apos;t count as required workdays.
        </p>
      </div>

      {/* Add new day off */}
      {isAdmin && (
        <Card className="border-white/[0.06] bg-card/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Add Day Off</p>
                <p className="text-xs text-muted-foreground">Mark a date as non-working</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  placeholder="e.g. National Holiday"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <Button onClick={handleAdd} disabled={adding} size="sm">
                {adding ? "Adding…" : "Add Day Off"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month navigation & list */}
      <Card className="border-white/[0.06] bg-card/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <CalendarOff className="h-4 w-4 text-orange-400" />
              </div>
              <p className="font-medium text-sm">
                {MONTH_LABELS[viewMonth - 1]} {viewYear}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                ←
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                →
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : daysOff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No days off set for {MONTH_LABELS[viewMonth - 1]} {viewYear}
            </p>
          ) : (
            <div className="space-y-2">
              {daysOff.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-400">
                      {new Date(day.date + "T00:00:00").getDate()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatDate(day.date)}</p>
                      {day.label && (
                        <p className="text-xs text-muted-foreground">{day.label}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(day.id, day.date)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            {daysOff.length} day{daysOff.length !== 1 ? "s" : ""} off in {MONTH_LABELS[viewMonth - 1]}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Settings Page ────────────────────────────────────────────────

type Tab = "locations" | "workday" | "daysoff";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("locations");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "locations", label: "Locations", icon: <MapPin className="h-4 w-4" /> },
    { id: "workday", label: "Workday", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "daysoff", label: "Days Off", icon: <CalendarOff className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your studio configuration
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-150 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "locations" && <LocationTab />}
      {activeTab === "workday" && <WorkdayTab />}
      {activeTab === "daysoff" && <DaysOffTab />}
    </div>
  );
}
