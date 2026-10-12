DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'User'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] NOT NULL DEFAULT ARRAY['STUDENT']::"Role"[];
    UPDATE "User" SET "roles" = ARRAY["role"];
    ALTER TABLE "User" DROP COLUMN "role";
  END IF;
END $$;
