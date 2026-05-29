import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Pass --commit to actually write. Without it this is a dry run.
const COMMIT = process.argv.includes("--commit");

const CORRECTION_NOTE = "Imported from manual Jan–Apr 2026 report";
const QR_TOKEN = "MANUAL_IMPORT";

// Sheet nickname → DB username (same crew as May)
const USERNAME_BY_NAME: Record<string, string> = {
  Moza:     "moza",
  Ridho:    "ridho",
  Zelda:    "zelda",
  Kenza:    "kenza",
  Vino:     "vino",
  Sinta:    "sinta",
  Nasywa:   "chiwa",
  Nia:      "nia",
  Ocha:     "ocha",
  Sasa:     "sasa",
  Adjie:    "adjie",
  "Rifa'i": "rifa'i",
};

// Sheet symbol → DB status
const STATUS_BY_SYMBOL: Record<string, string> = {
  "✔":  "check-in",  // present on a workday
  "✔✔": "check-in",  // present on an off-day (date determines off-day bonus in reports)
  "I":  "leave",     // izin
  "S":  "sakit",
  "A":  "alpha",
  "↩":  "comp_off",
};

type DataFile = {
  months: Array<{
    month: string; // "2026-01"
    rows: Array<{ name: string; days: Record<string, string> }>;
  }>;
};

async function main() {
  const data: DataFile = JSON.parse(
    readFileSync(new URL("./jan-apr-2026-data.json", import.meta.url), "utf-8"),
  );

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("No admin user found — cannot stamp correctedBy.");

  // Load all users once
  const allUsers = await prisma.user.findMany({ select: { id: true, username: true } });
  const userIdByUsername = Object.fromEntries(allUsers.map((u) => [u.username, u.id]));

  let inserted = 0, skipped = 0, unknown = 0;

  for (const { month, rows } of data.months) {
    const [yearStr, monStr] = month.split("-");
    const year = Number(yearStr);
    const mon = Number(monStr); // 1-based

    console.log(`\n=== ${month} ===`);

    for (const { name, days } of rows) {
      const username = USERNAME_BY_NAME[name];
      if (!username) {
        console.warn(`  UNKNOWN name: "${name}" — skipped`);
        unknown++;
        continue;
      }
      const userId = userIdByUsername[username];
      if (!userId) {
        console.warn(`  No DB user for username "${username}" (sheet: "${name}") — skipped`);
        unknown++;
        continue;
      }

      for (const [dayStr, symbol] of Object.entries(days)) {
        const day = Number(dayStr);
        const status = STATUS_BY_SYMBOL[symbol];
        if (!status) {
          console.warn(`  Unknown symbol "${symbol}" for ${name} day ${day} — skipped`);
          skipped++;
          continue;
        }

        const date = `${month}-${String(day).padStart(2, "0")}`;

        // Check existing
        const existing = await prisma.attendance.findUnique({
          where: { userId_date: { userId, date } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // Compute isLate: check-in after 08:00 WIB
        // All manual imports use the default 08:00 start → not late
        const isLate = false;

        const checkInTime =
          status === "check-in"
            ? new Date(`${date}T08:00:00+07:00`)
            : null;
        const checkOutTime =
          status === "check-in"
            ? new Date(`${date}T16:00:00+07:00`)
            : null;

        if (COMMIT) {
          await prisma.attendance.create({
            data: {
              userId,
              date,
              checkInTime,
              checkOutTime,
              qrTokenUsed: QR_TOKEN,
              isLate,
              status,
              correctedBy: admin.id,
              correctedAt: new Date(),
              correctionNote: CORRECTION_NOTE,
            },
          });
        }

        console.log(`  ${COMMIT ? "INSERT" : "DRY"} ${name} ${date} ${symbol} → ${status}`);
        inserted++;
      }
    }
  }

  console.log(`\n✓ Done. inserted=${inserted} skipped=${skipped} unknown=${unknown}`);
  if (!COMMIT) console.log("  (dry run — re-run with --commit to write)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
