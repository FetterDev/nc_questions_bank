-- DropIndex
DROP INDEX "users_externalAuthId_key";

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "login" SET NOT NULL,
ALTER COLUMN "passwordHash" SET NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
DROP COLUMN "externalAuthId";

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");
