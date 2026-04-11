ALTER TABLE "training_sessions"
ADD COLUMN "trainerId" TEXT,
ADD COLUMN "feedback" TEXT;

ALTER TABLE "training_sessions"
ADD CONSTRAINT "training_sessions_trainerId_fkey"
FOREIGN KEY ("trainerId") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "training_sessions_trainerId_finishedAt_idx"
ON "training_sessions"("trainerId", "finishedAt" DESC);
