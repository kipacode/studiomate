-- Migration: add_location_id_and_workday_settings

-- 1. Ensure locationId exists on Attendance
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

-- Add FK only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_locationId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
      ADD CONSTRAINT "Attendance_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Create WorkdaySettings table
CREATE TABLE IF NOT EXISTS "WorkdaySettings" (
  "id"                   TEXT NOT NULL DEFAULT 'singleton',
  "weekStartDay"         INTEGER NOT NULL DEFAULT 2,
  "workDays"             TEXT NOT NULL DEFAULT '2,3,4,5,6',
  "optionalWorkDays"     TEXT NOT NULL DEFAULT '0,1',
  "monthlyCountMode"     TEXT NOT NULL DEFAULT 'calendar',
  "fixedMonthlyWorkdays" INTEGER NOT NULL DEFAULT 22,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkdaySettings_pkey" PRIMARY KEY ("id")
);
