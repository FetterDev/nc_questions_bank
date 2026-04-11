-- CreateEnum
CREATE TYPE "TrainingSessionStatus" AS ENUM ('COMPLETED', 'ABANDONED_SAVED');

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TrainingSessionStatus" NOT NULL,
    "resultsCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_session_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "difficulty" SMALLINT NOT NULL,
    "result" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_session_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_session_result_topics" (
    "resultId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,

    CONSTRAINT "training_session_result_topics_pkey" PRIMARY KEY ("resultId","topicId")
);

-- CreateIndex
CREATE INDEX "training_sessions_userId_finishedAt_idx"
ON "training_sessions"("userId", "finishedAt" DESC);

-- CreateIndex
CREATE INDEX "training_session_results_sessionId_position_idx"
ON "training_session_results"("sessionId", "position");

-- CreateIndex
CREATE INDEX "training_session_results_questionId_createdAt_idx"
ON "training_session_results"("questionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "training_session_result_topics_topicId_idx"
ON "training_session_result_topics"("topicId");

-- AddForeignKey
ALTER TABLE "training_sessions"
ADD CONSTRAINT "training_sessions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_session_results"
ADD CONSTRAINT "training_session_results_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_session_result_topics"
ADD CONSTRAINT "training_session_result_topics_resultId_fkey"
FOREIGN KEY ("resultId") REFERENCES "training_session_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
