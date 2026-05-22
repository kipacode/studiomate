// ── Role & Category Types ──────────────────────────────────────────

export type UserRole = "admin" | "employee" | "intern" | "freelancer";
export type AttendanceStatus = "checked_in" | "checked_out" | "not_yet" | "late" | "leave";
export type Mood =
  | "happy"
  | "calm"
  | "focused"
  | "energetic"
  | "tired"
  | "stressed"
  | "excited"
  | "sad"
  | "angry"
  | "cool"
  | "caffeinated"
  | "neutral";

// ── Data Models ────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: "active" | "inactive";
  birthDate?: string;
  avatar?: string;
  mood?: Mood;
  internshipStart?: string;
  internshipEnd?: string;
  homeLat?: number;
  homeLng?: number;
  homeLabel?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdBy: string;
  isActive: boolean;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  qrTokenUsed: string;
  isLate: boolean;
  flagged: boolean;
  flagNote?: string;
  status?: string;
}

export interface QRToken {
  id: string;
  token: string;
  validDate: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

// ── Dashboard Types ────────────────────────────────────────────────

export interface DashboardSummary {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  recentCheckIns: number;
  totalMembers: number;
}

export interface AttendanceWithUser extends Attendance {
  user: User;
}
