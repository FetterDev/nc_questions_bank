-- Add structured content blocks for questions and training history snapshots.
ALTER TABLE "questions"
ADD COLUMN "textBlocks" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "answerBlocks" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "training_session_results"
ADD COLUMN "questionTextBlocks" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "questions"
SET
  "textBlocks" = jsonb_build_array(
    jsonb_build_object('kind', 'text', 'content', "text")
  ),
  "answerBlocks" = jsonb_build_array(
    jsonb_build_object('kind', 'text', 'content', "answer")
  );

UPDATE "training_session_results"
SET "questionTextBlocks" = jsonb_build_array(
  jsonb_build_object('kind', 'text', 'content', "questionText")
);

ALTER TABLE "questions"
ALTER COLUMN "textBlocks" DROP DEFAULT,
ALTER COLUMN "answerBlocks" DROP DEFAULT;

ALTER TABLE "training_session_results"
ALTER COLUMN "questionTextBlocks" DROP DEFAULT;
