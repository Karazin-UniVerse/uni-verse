-- Version-specific authorization; does not change shared semester calendars.
ALTER TABLE "TimetableVersion"
ADD COLUMN IF NOT EXISTS "automaticMakeupDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
