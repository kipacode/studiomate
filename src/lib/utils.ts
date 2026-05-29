import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AttendanceStatus, UserRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date / Time Helpers ────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Attendance Status Semantics ────────────────────────────────────
// Raw DB `Attendance.status` values: "check-in" (present, incl. off-day work),
// "leave" (izin), "sakit", "alpha" (unexcused absence), "comp_off" (off paid from surplus).

/** Raw statuses that count as NOT present (excused leave or unexcused absence). */
export const NON_PRESENT_STATUSES = ["leave", "sakit", "alpha"];

/**
 * True when a record counts as a present/worked day.
 * Includes "check-in" (real attendance) and "comp_off" — comp_off substitutes a
 * would-be izin/sakit day, so it counts as present even though it has no check-in time.
 */
export function isPresentStatus(status?: string | null): boolean {
  return !NON_PRESENT_STATUSES.includes(status ?? "");
}

/** Excused non-attendance — counts in the "leave" bucket, not as an unexcused no-show. */
export function isExcusedStatus(status?: string | null): boolean {
  return status === "leave" || status === "sakit";
}

/** Short human label for a raw DB status (used in badges). */
export function rawStatusLabel(status?: string | null): string {
  switch (status) {
    case "leave":
      return "On Leave";
    case "sakit":
      return "Sakit";
    case "alpha":
      return "Alpha";
    case "comp_off":
      return "Comp Off";
    default:
      return "Present";
  }
}

/** Badge classes for a raw DB status (falls back to present/late styling). */
export function rawStatusBadgeClass(status?: string | null, isLate = false): string {
  switch (status) {
    case "leave":
      return "bg-indigo-500/10 text-indigo-400";
    case "sakit":
      return "bg-rose-500/10 text-rose-400";
    case "alpha":
      return "bg-red-500/10 text-red-400";
    case "comp_off":
      return "bg-violet-500/10 text-violet-400";
    default:
      return isLate ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400";
  }
}

// ── Status Labels & Colors ─────────────────────────────────────────

export function getStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case "checked_in":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "checked_out":
      return "bg-sky-500/15 text-sky-400 border-sky-500/20";
    case "not_yet":
      return "bg-neutral-500/15 text-neutral-400 border-neutral-500/20";
    case "late":
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "leave":
      return "bg-indigo-500/15 text-indigo-400 border-indigo-500/20";
    case "sakit":
      return "bg-rose-500/15 text-rose-400 border-rose-500/20";
    case "alpha":
      return "bg-red-500/15 text-red-400 border-red-500/20";
    case "comp_off":
      return "bg-violet-500/15 text-violet-400 border-violet-500/20";
  }
}

export function getStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case "checked_in":
      return "Present";
    case "checked_out":
      return "Checked Out";
    case "not_yet":
      return "Not Yet";
    case "late":
      return "Late";
    case "leave":
      return "On Leave";
    case "sakit":
      return "Sakit";
    case "alpha":
      return "Alpha";
    case "comp_off":
      return "Comp Off";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "employee":
      return "Employee";
    case "intern":
      return "Intern (PKL)";
    case "freelancer":
      return "Freelancer";
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-violet-500/15 text-violet-400 border-violet-500/20";
    case "employee":
      return "bg-sky-500/15 text-sky-400 border-sky-500/20";
    case "intern":
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "freelancer":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  }
}

// ── User Helpers ───────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getInternProgress(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function getInternDaysRemaining(end: string): number {
  const endDate = new Date(end);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
