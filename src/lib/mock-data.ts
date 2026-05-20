import {
  User,
  Attendance,
  ActivityLog,
  QRToken,
  Location,
  DashboardSummary,
  AttendanceStatus,
  AttendanceWithUser,
  ActivityLogWithUser,
} from "./types";

// ── Helpers ────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function timeToday(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ── Users ──────────────────────────────────────────────────────────

export const mockUsers: User[] = [
  {
    id: "u-001",
    name: "Admin Kipa",
    username: "admin",
    email: "admin@kipaworks.studio",
    password: "hashed",
    role: "admin",
    status: "active",
    birthDate: "1990-05-15",
    avatar: "",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "u-002",
    name: "Moza Maiandra Azzarine",
    username: "moza",
    email: "mozamaiandra@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-03-20",
    avatar: "",
    createdAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "u-003",
    name: "Eni Kurnia Ningsih",
    username: "eni",
    email: "enikurniagningsih96@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-07-02",
    avatar: "",
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "u-004",
    name: "Nasywa Talita Sakhi",
    username: "nasywa",
    email: "nsywa.sakhi@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-12-26",
    avatar: "",
    createdAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "u-005",
    name: "Shandy Ocha Juliana",
    username: "shandy",
    email: "shandyocha@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2009-07-18",
    avatar: "",
    internshipStart: "2026-03-01",
    internshipEnd: "2026-08-31",
    homeLat: -7.972,
    homeLng: 112.641,
    homeLabel: "Kos Sumbersari",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "u-006",
    name: "Desinta Saskiyah Rahmawati",
    username: "desinta",
    email: "sasadesini3@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-12-07",
    avatar: "",
    createdAt: "2024-03-20T00:00:00Z",
  },
  {
    id: "u-007",
    name: "Kenza Agustin Demirel Putriyosa",
    username: "kenza",
    email: "kenzademirel@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-08-04",
    avatar: "",
    createdAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "u-008",
    name: "Sinta Putri Andari",
    username: "sinta",
    email: "fifgaa3@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-06-14",
    avatar: "",
    createdAt: "2024-04-15T00:00:00Z",
  },
  {
    id: "u-009",
    name: "Alvino Aditya Pasha",
    username: "alvino",
    email: "alvinomld@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2008-12-22",
    avatar: "",
    createdAt: "2024-05-01T00:00:00Z",
  },
  {
    id: "u-010",
    name: "Muhammad Ridho Fahrudin",
    username: "ridho",
    email: "frul5606@gmail.com",
    password: "hashed",
    role: "intern",
    status: "active",
    birthDate: "2009-06-30",
    avatar: "",
    createdAt: "2024-05-15T00:00:00Z",
  },
];

// ── Office Location ────────────────────────────────────────────────

export const mockLocations: Location[] = [
  {
    id: "loc-001",
    label: "Kipaworks Studio",
    address: "Jl. Soekarno Hatta No. 9, Lowokwaru, Malang",
    lat: -7.9666,
    lng: 112.6326,
    radiusMeters: 100,
    createdBy: "u-001",
    isActive: true,
  },
];

// ── QR Tokens ──────────────────────────────────────────────────────

export const mockQRTokens: QRToken[] = [
  {
    id: "qr-001",
    token: "KIPA-" + today().replace(/-/g, "") + "-STUDIO",
    validDate: today(),
    createdBy: "u-001",
    isActive: true,
    createdAt: timeToday(6, 0),
  },
  {
    id: "qr-002",
    token: "KIPA-" + daysAgo(1).replace(/-/g, "") + "-STUDIO",
    validDate: daysAgo(1),
    createdBy: "u-001",
    isActive: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ── Attendance Records ─────────────────────────────────────────────

function generateAttendanceForUser(
  userId: string,
  daysBack: number
): Attendance[] {
  const records: Attendance[] = [];
  for (let i = 0; i < daysBack; i++) {
    const date = daysAgo(i);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue;

    const isToday = i === 0;
    const hour = 7 + Math.floor(Math.abs(hashCode(userId + date)) % 3);
    const minute = Math.abs(hashCode(date + userId)) % 60;
    const isLate = hour > 8 || (hour === 8 && minute > 0);

    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);

    const checkOutD = new Date(date);
    checkOutD.setHours(17 + (Math.abs(hashCode(userId)) % 2), minute, 0, 0);

    records.push({
      id: `att-${userId}-${date}`,
      userId,
      date,
      checkInTime: d.toISOString(),
      checkOutTime: isToday ? null : checkOutD.toISOString(),
      qrTokenUsed: `KIPA-${date.replace(/-/g, "")}-STUDIO`,
      isLate,
      flagged: false,
    });
  }
  return records;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

const attendanceUserIds = ["u-002", "u-003", "u-004", "u-005", "u-006"];
export const mockAttendance: Attendance[] = attendanceUserIds.flatMap((uid) =>
  generateAttendanceForUser(uid, 14)
);

// ── Activity Categories ────────────────────────────────────────────

export const activityCategories = [
  { value: "design", label: "Design" },
  { value: "research", label: "Research" },
  { value: "admin", label: "Admin" },
  { value: "content", label: "Content" },
  { value: "development", label: "Development" },
  { value: "other", label: "Other" },
] as const;

// ── Activity Logs ──────────────────────────────────────────────────

const taskTitles: Record<string, string[]> = {
  design: [
    "Landing page redesign",
    "Icon set update",
    "Brand guide revision",
    "UI mockup for client X",
    "Social media banner",
  ],
  research: [
    "Competitor analysis",
    "User interview notes",
    "Market trend report",
    "UX benchmark study",
    "Tool evaluation",
  ],
  admin: [
    "Weekly team meeting",
    "Invoice preparation",
    "Client follow-up",
    "Project timeline update",
    "Equipment inventory",
  ],
  content: [
    "Blog post draft",
    "Portfolio copy update",
    "Case study write-up",
    "Newsletter content",
    "Social media caption",
  ],
  development: [
    "API endpoint refactor",
    "Bug fix: auth flow",
    "Database migration",
    "Frontend component library",
    "CI/CD pipeline setup",
  ],
  other: [
    "Studio cleanup",
    "Team lunch coordination",
    "Workshop preparation",
    "Documentation update",
    "Onboarding new member",
  ],
};

function generateActivitiesForUser(
  userId: string,
  daysBack: number
): ActivityLog[] {
  const logs: ActivityLog[] = [];
  const categories = Object.keys(taskTitles);

  for (let i = 0; i < daysBack; i++) {
    const date = daysAgo(i);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue;

    const numTasks = 2 + (Math.abs(hashCode(userId + date)) % 3);
    for (let t = 0; t < numTasks; t++) {
      const catIdx =
        Math.abs(hashCode(userId + date + t.toString())) % categories.length;
      const cat = categories[catIdx];
      const titles = taskTitles[cat];
      const titleIdx =
        Math.abs(hashCode(date + userId + t.toString())) % titles.length;

      const createdAt = new Date(date);
      createdAt.setHours(8 + t, 0, 0, 0);

      logs.push({
        id: `act-${userId}-${date}-${t}`,
        userId,
        date,
        taskTitle: titles[titleIdx],
        category: cat as ActivityLog["category"],
        description:
          t % 3 === 0
            ? "Working on this task for the team deliverable."
            : undefined,
        status: i === 0 && t === 0 ? "in_progress" : "done",
        estimatedHours: 1 + (Math.abs(hashCode(userId + t.toString())) % 4),
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
    }
  }
  return logs;
}

const activityUserIds = [
  "u-002", "u-003", "u-004", "u-005", "u-006", "u-007", "u-008",
];
export const mockActivities: ActivityLog[] = activityUserIds.flatMap((uid) =>
  generateActivitiesForUser(uid, 7)
);

// ── Query Functions ────────────────────────────────────────────────

export function getUserById(userId: string): User | undefined {
  return mockUsers.find((u) => u.id === userId);
}

export function getActiveMembers(): User[] {
  return mockUsers.filter((u) => u.status === "active" && u.role !== "admin");
}

export function getAttendanceStatus(userId: string): AttendanceStatus {
  const todayDate = today();
  const record = mockAttendance.find(
    (a) => a.userId === userId && a.date === todayDate
  );
  if (!record) return "not_yet";
  if (record.checkOutTime) return "checked_out";
  if (record.isLate) return "late";
  return "checked_in";
}

export function getTodayAttendance(): AttendanceWithUser[] {
  const todayDate = today();
  return mockAttendance
    .filter((a) => a.date === todayDate)
    .map((a) => ({ ...a, user: getUserById(a.userId)! }))
    .filter((a) => a.user);
}

export function getUserActivities(
  userId: string,
  date?: string
): ActivityLog[] {
  const targetDate = date || today();
  return mockActivities.filter(
    (a) => a.userId === userId && a.date === targetDate
  );
}

export function getAllTodayActivities(): ActivityLogWithUser[] {
  const todayDate = today();
  return mockActivities
    .filter((a) => a.date === todayDate)
    .map((a) => ({ ...a, user: getUserById(a.userId)! }))
    .filter((a) => a.user);
}

export function getDashboardSummary(): DashboardSummary {
  const todayDate = today();
  const members = getActiveMembers().filter((u) => u.role !== "freelancer");
  const todayRecords = mockAttendance.filter((a) => a.date === todayDate);

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);

  return {
    totalPresent: todayRecords.length,
    totalAbsent: members.length - todayRecords.length,
    totalLate: todayRecords.filter((a) => a.isLate).length,
    recentCheckIns: todayRecords.filter(
      (a) => a.checkInTime && new Date(a.checkInTime) >= oneHourAgo
    ).length,
    totalMembers: members.length,
  };
}

export function getAttendanceHistory(
  userId: string,
  days: number = 30
): Attendance[] {
  return mockAttendance
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

export function getWeeklyAttendanceCounts(): {
  day: string;
  present: number;
  late: number;
}[] {
  const result = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const date = daysAgo(i);
    const records = mockAttendance.filter((a) => a.date === date);
    const dow = new Date(date).getDay();
    result.push({
      day: dayNames[dow],
      present: records.length,
      late: records.filter((r) => r.isLate).length,
    });
  }
  return result;
}
