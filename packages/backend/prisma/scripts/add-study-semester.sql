-- Study semester (1-8) of a curriculum plan; existing plans stay without one.
ALTER TABLE "CurriculumPlan"
ADD COLUMN IF NOT EXISTS "studySemester" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumPlan_studySemester_range'
  ) THEN
    ALTER TABLE "CurriculumPlan"
    ADD CONSTRAINT "CurriculumPlan_studySemester_range"
    CHECK ("studySemester" IS NULL OR "studySemester" BETWEEN 1 AND 8);
  END IF;
END
$$;
