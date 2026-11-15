-- Source-day provenance; existing versions keep their events and authorizations.
ALTER TABLE "TimetableVersion"
ADD COLUMN IF NOT EXISTS "automaticMakeupDays" JSONB NOT NULL DEFAULT '[]'::JSONB;
