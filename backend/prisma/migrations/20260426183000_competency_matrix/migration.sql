-- CreateTable
CREATE TABLE "technology_stacks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technology_stacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stacks" (
    "userId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stacks_pkey" PRIMARY KEY ("userId","stackId")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_competencies" (
    "questionId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_competencies_pkey" PRIMARY KEY ("questionId","competencyId")
);

-- CreateTable
CREATE TABLE "question_evaluation_criteria" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "competencyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question_criteria" (
    "id" TEXT NOT NULL,
    "interviewQuestionId" TEXT NOT NULL,
    "sourceCriterionId" TEXT,
    "competencyId" TEXT,
    "competencyName" TEXT,
    "competencySlug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "result" "TrainingSessionResultMark",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_question_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technology_stacks_name_key" ON "technology_stacks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technology_stacks_slug_key" ON "technology_stacks"("slug");

-- CreateIndex
CREATE INDEX "user_stacks_stackId_idx" ON "user_stacks"("stackId");

-- CreateIndex
CREATE INDEX "competencies_stackId_idx" ON "competencies"("stackId");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_stackId_slug_key" ON "competencies"("stackId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_stackId_position_key" ON "competencies"("stackId", "position");

-- CreateIndex
CREATE INDEX "question_competencies_competencyId_idx" ON "question_competencies"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "question_evaluation_criteria_questionId_position_key" ON "question_evaluation_criteria"("questionId", "position");

-- CreateIndex
CREATE INDEX "question_evaluation_criteria_competencyId_idx" ON "question_evaluation_criteria"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_criteria_interviewQuestionId_position_key" ON "interview_question_criteria"("interviewQuestionId", "position");

-- CreateIndex
CREATE INDEX "interview_question_criteria_competencyId_idx" ON "interview_question_criteria"("competencyId");

-- AddForeignKey
ALTER TABLE "user_stacks" ADD CONSTRAINT "user_stacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stacks" ADD CONSTRAINT "user_stacks_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "technology_stacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "technology_stacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_competencies" ADD CONSTRAINT "question_competencies_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_competencies" ADD CONSTRAINT "question_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_evaluation_criteria" ADD CONSTRAINT "question_evaluation_criteria_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_evaluation_criteria" ADD CONSTRAINT "question_evaluation_criteria_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_criteria" ADD CONSTRAINT "interview_question_criteria_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

