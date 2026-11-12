-- Additive migration for TeacherSlotPreference table and SlotPreference enum
DO $$ BEGIN
    CREATE TYPE "SlotPreference" AS ENUM ('PREFERRED', 'UNDESIRABLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "TeacherSlotPreference" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "semesterCalendarId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "pair" INTEGER NOT NULL,
    "preference" "SlotPreference" NOT NULL,

    CONSTRAINT "TeacherSlotPreference_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeacherSlotPreference_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherSlotPreference_semesterCalendarId_fkey" FOREIGN KEY ("semesterCalendarId") REFERENCES "SemesterCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSlotPreference_teacherId_semesterCalendarId_weekday_pair_key"
ON "TeacherSlotPreference"("teacherId", "semesterCalendarId", "weekday", "pair");

CREATE INDEX IF NOT EXISTS "TeacherSlotPreference_semesterCalendarId_idx"
ON "TeacherSlotPreference"("semesterCalendarId");
