-- Study semester (1-8) of a curriculum plan; existing plans stay without one.
ALTER TABLE "CurriculumPlan"
ADD COLUMN IF NOT EXISTS "studySemester" INTEGER;
