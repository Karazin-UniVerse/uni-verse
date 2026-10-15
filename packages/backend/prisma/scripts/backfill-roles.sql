DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'USER' TO 'OPPORTUNITIES_USER';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'STUDENT'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'STUDENT' TO 'MOODLE_STUDENT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'User'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] NOT NULL DEFAULT ARRAY['OPPORTUNITIES_USER']::"Role"[];
    UPDATE "User" SET "roles" = ARRAY["role"];
    ALTER TABLE "User" DROP COLUMN "role";
  END IF;
END $$;
