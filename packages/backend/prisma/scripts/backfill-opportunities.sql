DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'Opportunity'
  ) THEN
    ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
    UPDATE "Opportunity"
    SET "publishedAt" = "createdAt"
    WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;
  END IF;
END $$;
