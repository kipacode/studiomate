-- Migration: add_attendance_corrections_and_default_offdays
-- This migration captures:
--   1. Audit columns on Attendance for admin manual edits/backfills
--   2. Updates the WorkdaySettings singleton to set Sun + Mon as optional days
--   3. Schema-level default for optionalWorkDays is updated to "0,1"

-- 1. Audit columns on Attendance
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctedBy"    TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctedAt"    TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "correctionNote" TEXT;

-- 2. Ensure optionalWorkDays column exists (may have been added directly to DB)
ALTER TABLE "WorkdaySettings" ADD COLUMN IF NOT EXISTS "optionalWorkDays" TEXT NOT NULL DEFAULT '0,1';

-- 3. Update existing singleton row so Sun + Mon are optional days
UPDATE "WorkdaySettings"
   SET "optionalWorkDays" = '0,1',
       "updatedAt"        = NOW()
 WHERE "id" = 'singleton';

-- 4. Confirm the schema-level default
ALTER TABLE "WorkdaySettings"
  ALTER COLUMN "optionalWorkDays" SET DEFAULT '0,1';
