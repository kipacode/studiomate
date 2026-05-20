import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding database…");

  // ── Users ──────────────────────────────────────────────────────────
  const adminPassword = await hash("admin123");
  const memberPassword = await hash("studio123");

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      id: "u-001",
      name: "Admin Kipa",
      username: "admin",
      email: "admin@kipaworks.studio",
      password: adminPassword,
      role: "admin",
      status: "active",
      birthDate: "1990-05-15",
      createdAt: new Date("2024-01-01"),
    },
  });

  const members = [
    { id: "u-002", name: "Moza Maiandra Azzarine",          username: "moza",    email: "mozamaiandra@gmail.com",        birthDate: "2008-03-20" },
    { id: "u-003", name: "Eni Kurnia Ningsih",               username: "eni",     email: "enikurniagningsih96@gmail.com", birthDate: "2008-07-02" },
    { id: "u-004", name: "Nasywa Talita Sakhi",              username: "nasywa",  email: "nsywa.sakhi@gmail.com",         birthDate: "2008-12-26" },
    { id: "u-005", name: "Shandy Ocha Juliana",              username: "shandy",  email: "shandyocha@gmail.com",          birthDate: "2009-07-18", homeLat: -7.972, homeLng: 112.641, homeLabel: "Kos Sumbersari" },
    { id: "u-006", name: "Desinta Saskiyah Rahmawati",       username: "desinta", email: "sasadesini3@gmail.com",         birthDate: "2008-12-07" },
    { id: "u-007", name: "Kenza Agustin Demirel Putriyosa",  username: "kenza",   email: "kenzademirel@gmail.com",        birthDate: "2008-08-04" },
    { id: "u-008", name: "Sinta Putri Andari",               username: "sinta",   email: "fifgaa3@gmail.com",             birthDate: "2008-06-14" },
    { id: "u-009", name: "Alvino Aditya Pasha",              username: "alvino",  email: "alvinomld@gmail.com",           birthDate: "2008-12-22" },
    { id: "u-010", name: "Muhammad Ridho Fahrudin",          username: "ridho",   email: "frul5606@gmail.com",            birthDate: "2009-06-30" },
  ];

  for (const m of members) {
    await prisma.user.upsert({
      where: { username: m.username },
      update: {},
      create: {
        ...m,
        password: memberPassword,
        role: "intern",
        status: "active",
        internshipStart: "2026-01-05",
        internshipEnd: "2026-06-30",
        createdAt: new Date("2026-05-20"),
      },
    });
  }

  // ── Office Location ────────────────────────────────────────────────
  await prisma.location.upsert({
    where: { id: "loc-001" },
    update: {},
    create: {
      id: "loc-001",
      label: "Kipaworks Studio",
      address: "Jl. Soekarno Hatta No. 9, Lowokwaru, Malang",
      lat: -7.9666,
      lng: 112.6326,
      radiusMeters: 100,
      createdBy: admin.id,
      isActive: true,
    },
  });

  // ── QR Tokens ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  await prisma.qRToken.upsert({
    where: { token: `KIPA-${today.replace(/-/g, "")}-STUDIO` },
    update: {},
    create: {
      token: `KIPA-${today.replace(/-/g, "")}-STUDIO`,
      validDate: today,
      createdBy: admin.id,
      isActive: true,
    },
  });

  await prisma.qRToken.upsert({
    where: { token: `KIPA-${yesterday.replace(/-/g, "")}-STUDIO` },
    update: {},
    create: {
      token: `KIPA-${yesterday.replace(/-/g, "")}-STUDIO`,
      validDate: yesterday,
      createdBy: admin.id,
      isActive: false,
    },
  });

  // ── Attendance Records ─────────────────────────────────────────────
  const memberIds = members.map((m) => m.id);

  function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  }

  function hashCode(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }

  for (const uid of memberIds) {
    for (let i = 0; i < 14; i++) {
      const date = daysAgo(i);
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) continue;

      const hour = 7 + (Math.abs(hashCode(uid + date)) % 3);
      const minute = Math.abs(hashCode(date + uid)) % 60;
      const isLate = hour > 8 || (hour === 8 && minute > 0);

      const checkIn = new Date(date);
      checkIn.setHours(hour, minute, 0, 0);

      const checkOut = new Date(date);
      checkOut.setHours(17 + (Math.abs(hashCode(uid)) % 2), minute, 0, 0);

      await prisma.attendance.upsert({
        where: { userId_date: { userId: uid, date } },
        update: {},
        create: {
          userId: uid,
          date,
          checkInTime: checkIn,
          checkOutTime: i === 0 ? null : checkOut,
          qrTokenUsed: `KIPA-${date.replace(/-/g, "")}-STUDIO`,
          isLate,
          flagged: false,
        },
      });
    }
  }

  // ── Activity Logs ──────────────────────────────────────────────────
  const taskTitles: Record<string, string[]> = {
    design:      ["Landing page redesign", "Icon set update", "Brand guide revision", "UI mockup for client X", "Social media banner"],
    research:    ["Competitor analysis", "User interview notes", "Market trend report", "UX benchmark study", "Tool evaluation"],
    admin:       ["Weekly team meeting", "Invoice preparation", "Client follow-up", "Project timeline update", "Equipment inventory"],
    content:     ["Blog post draft", "Portfolio copy update", "Case study write-up", "Newsletter content", "Social media caption"],
    development: ["API endpoint refactor", "Bug fix: auth flow", "Database migration", "Frontend component library", "CI/CD pipeline setup"],
    other:       ["Studio cleanup", "Team lunch coordination", "Workshop preparation", "Documentation update", "Onboarding new member"],
  };

  const activityUserIds = memberIds.slice(0, 7);
  const categories = Object.keys(taskTitles);

  for (const uid of activityUserIds) {
    for (let i = 0; i < 7; i++) {
      const date = daysAgo(i);
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) continue;

      const numTasks = 2 + (Math.abs(hashCode(uid + date)) % 3);
      for (let t = 0; t < numTasks; t++) {
        const catIdx = Math.abs(hashCode(uid + date + String(t))) % categories.length;
        const cat = categories[catIdx];
        const titles = taskTitles[cat];
        const titleIdx = Math.abs(hashCode(date + uid + String(t))) % titles.length;

        const createdAt = new Date(date);
        createdAt.setHours(8 + t, 0, 0, 0);

        await prisma.activityLog.create({
          data: {
            userId: uid,
            date,
            taskTitle: titles[titleIdx],
            category: cat as never,
            description: t % 3 === 0 ? "Working on this task for the team deliverable." : undefined,
            status: i === 0 && t === 0 ? "in_progress" : "done",
            estimatedHours: 1 + (Math.abs(hashCode(uid + String(t))) % 4),
            createdAt,
            updatedAt: createdAt,
          },
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log("  admin  → username: admin    / password: admin123");
  console.log("  member → username: moza     / password: studio123");
  console.log("  (all interns use password: studio123)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
