-- Migration: add_attendance_corrections_and_default_offdays
-- This migration captures:
--   1. Audit columns on Attendance for admin manual edits/backfills
--   2. Updates the WorkdaySettings singleton to set Sun + Mon as optional days
--   3. Schema-level default for optionalWorkDays is updated to "0,1"

-- 1. Audit columns on Attendance
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctedBy"    TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctedAt"    TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctionNote" TEXT;

-- 2. Update existing singleton row so Sun + Mon are optional days
UPDATE "WorkdaySettings"
   SET "optionalWorkDays" = '0,1',
       "updatedAt"        = NOW()
 WHERE "id" = 'singleton';

-- 3. Update the schema-level default for fresh installs
ALTER TABLE "WorkdaySettings"
  ALTER COLUMN "optionalWorkDays" SET DEFAULT '0,1';
