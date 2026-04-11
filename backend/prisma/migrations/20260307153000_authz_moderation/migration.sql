-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "QuestionChangeRequestType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "QuestionChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "externalAuthId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_change_requests" (
    "id" TEXT NOT NULL,
    "type" "QuestionChangeRequestType" NOT NULL,
    "status" "QuestionChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "targetQuestionId" TEXT,
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "baseSnapshot" JSONB,
    "proposedSnapshot" JSONB,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_externalAuthId_key" ON "users"("externalAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "question_change_requests_status_createdAt_idx"
ON "question_change_requests"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "question_change_requests_authorId_status_createdAt_idx"
ON "question_change_requests"("authorId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "question_change_requests_targetQuestionId_status_idx"
ON "question_change_requests"("targetQuestionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "question_change_requests_pending_targetQuestionId_key"
ON "question_change_requests"("targetQuestionId")
WHERE "status" = 'PENDING' AND "targetQuestionId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "question_change_requests"
ADD CONSTRAINT "question_change_requests_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_change_requests"
ADD CONSTRAINT "question_change_requests_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
