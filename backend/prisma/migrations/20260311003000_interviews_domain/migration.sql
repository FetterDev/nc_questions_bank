-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('DRAFT', 'PLANNED', 'SCHEDULED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewCycleMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "interview_cycles" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "mode" "InterviewCycleMode" NOT NULL DEFAULT 'AUTO',
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "intervieweeId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "presetId" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "interviews_interviewer_not_interviewee" CHECK ("interviewerId" <> "intervieweeId")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionTextContent" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "answerContent" JSONB NOT NULL,
    "difficulty" SMALLINT NOT NULL,
    "result" "TrainingSessionResultMark",
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question_topics" (
    "interviewQuestionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,

    CONSTRAINT "interview_question_topics_pkey" PRIMARY KEY ("interviewQuestionId","topicId")
);

-- CreateIndex
CREATE INDEX "interview_cycles_periodStart_periodEnd_idx" ON "interview_cycles"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "interview_cycles_createdByAdminId_idx" ON "interview_cycles"("createdByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_cycleId_interviewerId_intervieweeId_key" ON "interviews"("cycleId", "interviewerId", "intervieweeId");

-- CreateIndex
CREATE INDEX "interviews_plannedDate_status_idx" ON "interviews"("plannedDate", "status");

-- CreateIndex
CREATE INDEX "interviews_interviewerId_idx" ON "interviews"("interviewerId");

-- CreateIndex
CREATE INDEX "interviews_intervieweeId_idx" ON "interviews"("intervieweeId");

-- CreateIndex
CREATE INDEX "interviews_cycleId_idx" ON "interviews"("cycleId");

-- CreateIndex
CREATE INDEX "interview_questions_interviewId_position_idx" ON "interview_questions"("interviewId", "position");

-- CreateIndex
CREATE INDEX "interview_questions_questionId_idx" ON "interview_questions"("questionId");

-- CreateIndex
CREATE INDEX "interview_question_topics_topicId_idx" ON "interview_question_topics"("topicId");

-- AddForeignKey
ALTER TABLE "interview_cycles" ADD CONSTRAINT "interview_cycles_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "interview_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_intervieweeId_fkey" FOREIGN KEY ("intervieweeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "training_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_topics" ADD CONSTRAINT "interview_question_topics_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
