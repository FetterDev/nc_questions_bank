CREATE TYPE "TrainingSessionResultMark" AS ENUM ('CORRECT', 'INCORRECT', 'PARTIAL');

ALTER TABLE "training_sessions"
ADD COLUMN "partialCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "training_session_results"
ADD COLUMN "result_next" "TrainingSessionResultMark";

UPDATE "training_session_results"
SET "result_next" = CASE
  WHEN result = true THEN 'CORRECT'::"TrainingSessionResultMark"
  ELSE 'INCORRECT'::"TrainingSessionResultMark"
END;

ALTER TABLE "training_session_results"
ALTER COLUMN "result_next" SET NOT NULL;

ALTER TABLE "training_session_results"
DROP COLUMN "result";

ALTER TABLE "training_session_results"
RENAME COLUMN "result_next" TO "result";
