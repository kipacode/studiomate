import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Pass --commit to actually write. Without it, this is a dry run.
const COMMIT = process.argv.includes("--commit");

const MONTH = "2026-05";
const [YEAR, MON] = MONTH.split("-").map(Number); // MON is 1-based
const CORRECTION_NOTE = "Imported from manual May 2026 report";
const QR_TOKEN = "MANUAL_IMPORT";

// Studio-wide closures (everyone blank): treated as DayOff so reports don't mark absent.
const CLOSURE_DATES = ["2026-05-02", "2026-05-16"];

// Sheet nickname -> DB username
const USERNAME_BY_NAME: Record<string, string> = {
  Moza: "moza",
  Ridho: "ridho",
  Zelda: "zelda",
  Kenza: "kenza",
  Vino: "vino",
  Sinta: "sinta",
  Ciwa: "chiwa",
  Nia: "nia",
  Ocha: "ocha",
  Sasa: "sasa",
  Adjie: "adjie",
  "Rifa'i": "rifa'i",
  Anggun: "anggunnur",
  Della: "della",
};

// Sheet symbol -> DB Attendance.status
const STATUS_BY_SYMBOL: Record<string, string> = {
  "✔": "check-in", // present on a workday
  "✔✔": "check-in", // present on an off-day (date makes it a surplus in reports)
  I: "leave", // izin
  S: "sakit",
  A: "alpha",
  "↩": "comp_off",
};

type DataFile = { rows: { name: string; days: Record<string, string> }[] };

function dateStr(day: number): string {
  return `${MONTH}-${String(day).padStart(2, "0")}`;
}

async function main() {
  const data: DataFile = JSON.parse(
    readFileSync(new URL("./may-2026-data.json", import.meta.url), "utf-8"),
  );

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("No admin user found — cannot stamp correctedBy.");

  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const idByUsername = new Map(users.map((u) => [u.username, u.id]));

  console.log(`\n=== May 2026 import (${COMMIT ? "COMMIT" : "DRY RUN"}) ===\n`);

  const statusTally: Record<string, number> = {};
  let toInsert = 0;
  let skippedExisting = 0;
  const unmatchedNames: string[] = [];
  const unknownSymbols: string[] = [];

  for (const row of data.rows) {
    const username = USERNAME_BY_NAME[row.name];
    const userId = username ? idByUsername.get(username) : undefined;
    if (!userId) {
      unmatchedNames.push(row.name);
      continue;
    }

    for (const [dayStr, symbol] of Object.entries(row.days)) {
      const status = STATUS_BY_SYMBOL[symbol];
      if (!status) {
        unknownSymbols.push(`${row.name} day ${dayStr}: "${symbol}"`);
        continue;
      }
      const day = Number(dayStr);
      const date = dateStr(day);

      const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date } },
      });
      if (existing) {
        skippedExisting++;
        continue;
      }

      const isPresent = status === "check-in";
      const checkInTime = isPresent ? new Date(YEAR, MON - 1, day, 8, 0, 0) : null;
      const checkOutTime = isPresent ? new Date(YEAR, MON - 1, day, 16, 0, 0) : null;

      statusTally[status] = (statusTally[status] ?? 0) + 1;
      toInsert++;

      if (COMMIT) {
        await prisma.attendance.create({
          data: {
            userId,
            date,
            checkInTime,
            checkOutTime,
            qrTokenUsed: QR_TOKEN,
            isLate: false,
            status,
            correctedBy: admin.id,
            correctedAt: new Date(),
            correctionNote: CORRECTION_NOTE,
          },
        });
      }
    }
  }

  // DayOff closures
  let dayOffCreated = 0;
  for (const date of CLOSURE_DATES) {
    const existing = await prisma.dayOff.findUnique({ where: { date } });
    if (existing) continue;
    dayOffCreated++;
    if (COMMIT) {
      await prisma.dayOff.create({
        data: { date, label: "Studio closed (manual report)", createdBy: admin.id },
      });
    }
  }

  console.log("Attendance rows by status:", statusTally);
  console.log(`Attendance to insert: ${toInsert}`);
  console.log(`Skipped (already had a record): ${skippedExisting}`);
  console.log(`DayOff closures to create: ${dayOffCreated} (${CLOSURE_DATES.join(", ")})`);
  if (unmatchedNames.length) console.log("UNMATCHED NAMES (skipped):", unmatchedNames);
  if (unknownSymbols.length) console.log("UNKNOWN SYMBOLS (skipped):", unknownSymbols);

  if (!COMMIT) {
    console.log("\nDry run only — nothing written. Re-run with --commit to apply.\n");
  } else {
    console.log("\nDone. Records written.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
