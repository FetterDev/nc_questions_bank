-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "login" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

DO $$
DECLARE
  user_row RECORD;
  base_login TEXT;
  candidate_login TEXT;
BEGIN
  FOR user_row IN
    SELECT "id", "email", "externalAuthId"
    FROM "users"
    ORDER BY "createdAt", "id"
  LOOP
    base_login := lower(split_part(coalesce(user_row."email", ''), '@', 1));
    base_login := regexp_replace(base_login, '[^a-z0-9._-]+', '-', 'g');
    base_login := regexp_replace(base_login, '-{2,}', '-', 'g');
    base_login := trim(BOTH '-' FROM base_login);

    IF base_login = '' THEN
      base_login := lower(
        regexp_replace(
          coalesce(user_row."externalAuthId", ''),
          '[^a-z0-9._-]+',
          '-',
          'g'
        )
      );
      base_login := regexp_replace(base_login, '-{2,}', '-', 'g');
      base_login := trim(BOTH '-' FROM base_login);
    END IF;

    IF base_login = '' THEN
      base_login := 'user';
    END IF;

    candidate_login := substring(base_login FROM 1 FOR 64);

    IF EXISTS (
      SELECT 1
      FROM "users" existing
      WHERE existing."login" = candidate_login
    ) THEN
      candidate_login := substring(base_login FROM 1 FOR 57)
        || '-'
        || substring(user_row."id" FROM 1 FOR 6);
    END IF;

    UPDATE "users"
    SET
      "login" = candidate_login,
      "passwordHash" = '__RESET_REQUIRED__'
    WHERE "id" = user_row."id";
  END LOOP;
END $$;
