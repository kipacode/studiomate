-- Migration: add_day_off

CREATE TABLE IF NOT EXISTS "DayOff" (
  "id"        TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "label"     TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DayOff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DayOff_date_key" ON "DayOff"("date");
