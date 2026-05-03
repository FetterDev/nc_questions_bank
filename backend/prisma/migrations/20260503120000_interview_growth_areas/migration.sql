ALTER TABLE "interviews" ADD COLUMN "growthAreas" TEXT;

ALTER TABLE "interview_question_criteria"
  ADD COLUMN "isGrowthPoint" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "growthArea" TEXT;

CREATE INDEX "interview_question_criteria_growth_idx"
  ON "interview_question_criteria"("competencyId", "isGrowthPoint");
