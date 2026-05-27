-- Migration: add_location_id_and_workday_settings
-- This migration captures:
--   1. The locationId column on Attendance (was added directly to DB, now formalized)
--   2. The new WorkdaySettings singleton table

-- 1. Ensure locationId exists on Attendance (idempotent via IF NOT EXISTS)
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

ALTER TABLE "Attendance"
  ADD CONSTRAINT IF NOT EXISTS "Attendance_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Create WorkdaySettings table
CREATE TABLE IF NOT EXISTS "WorkdaySettings" (
  "id"                   TEXT NOT NULL DEFAULT 'singleton',
  "weekStartDay"         INTEGER NOT NULL DEFAULT 1,
  "workDays"             TEXT NOT NULL DEFAULT '1,2,3,4,5',
  "monthlyCountMode"     TEXT NOT NULL DEFAULT 'calendar',
  "fixedMonthlyWorkdays" INTEGER NOT NULL DEFAULT 22,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkdaySettings_pkey" PRIMARY KEY ("id")
);
