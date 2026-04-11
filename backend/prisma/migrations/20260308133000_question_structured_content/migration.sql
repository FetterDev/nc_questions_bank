ALTER TABLE "questions"
ADD COLUMN "textContent" JSONB,
ADD COLUMN "answerContent" JSONB;

ALTER TABLE "training_session_results"
ADD COLUMN "questionTextContent" JSONB;

CREATE OR REPLACE FUNCTION question_blocks_to_structured_content(blocks JSONB, fallback_text TEXT)
RETURNS JSONB
LANGUAGE sql
AS $$
  WITH normalized_blocks AS (
    SELECT jsonb_array_elements(COALESCE(blocks, '[]'::jsonb)) AS block
  ),
  normalized_languages AS (
    SELECT NULLIF(LOWER(BTRIM(COALESCE(block ->> 'language', ''))), '') AS language
    FROM normalized_blocks
    WHERE block ->> 'kind' = 'code'
      AND BTRIM(COALESCE(block ->> 'content', '')) <> ''
  )
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'text',
      COALESCE(
        (
          SELECT NULLIF(
            STRING_AGG(
              NULLIF(BTRIM(REGEXP_REPLACE(block ->> 'content', E'\\r\\n?', E'\\n', 'g')), ''),
              E'\n\n'
            ),
            ''
          )
          FROM normalized_blocks
          WHERE block ->> 'kind' = 'text'
        ),
        NULLIF(BTRIM(REGEXP_REPLACE(COALESCE(fallback_text, ''), E'\\r\\n?', E'\\n', 'g')), '')
      ),
      'code',
      (
        SELECT NULLIF(
          STRING_AGG(
            NULLIF(REGEXP_REPLACE(block ->> 'content', E'\\r\\n?', E'\\n', 'g'), ''),
            E'\n\n'
          ),
          ''
        )
        FROM normalized_blocks
        WHERE block ->> 'kind' = 'code'
          AND BTRIM(COALESCE(block ->> 'content', '')) <> ''
      ),
      'codeLanguage',
      (
        SELECT CASE
          WHEN COUNT(DISTINCT language) = 1
            AND MAX(language) IN ('javascript', 'jsx', 'typescript', 'tsx')
          THEN MAX(language)
          ELSE NULL
        END
        FROM normalized_languages
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION question_snapshot_to_structured_content(snapshot JSONB)
RETURNS JSONB
LANGUAGE sql
AS $$
  SELECT CASE
    WHEN snapshot IS NULL OR jsonb_typeof(snapshot) <> 'object' THEN snapshot
    WHEN snapshot ? 'textContent' AND snapshot ? 'answerContent' THEN snapshot
    ELSE jsonb_strip_nulls(
      (snapshot - 'textBlocks' - 'answerBlocks') ||
      jsonb_build_object(
        'textContent',
        question_blocks_to_structured_content(snapshot -> 'textBlocks', snapshot ->> 'text'),
        'answerContent',
        question_blocks_to_structured_content(snapshot -> 'answerBlocks', snapshot ->> 'answer')
      )
    )
  END;
$$;

UPDATE "questions"
SET
  "textContent" = question_blocks_to_structured_content("textBlocks", text),
  "answerContent" = question_blocks_to_structured_content("answerBlocks", answer);

UPDATE "training_session_results"
SET "questionTextContent" = question_blocks_to_structured_content("questionTextBlocks", "questionText");

UPDATE "question_change_requests"
SET
  "baseSnapshot" = question_snapshot_to_structured_content("baseSnapshot"),
  "proposedSnapshot" = question_snapshot_to_structured_content("proposedSnapshot");

ALTER TABLE "questions"
ALTER COLUMN "textContent" SET NOT NULL,
ALTER COLUMN "answerContent" SET NOT NULL;

ALTER TABLE "training_session_results"
ALTER COLUMN "questionTextContent" SET NOT NULL;

ALTER TABLE "questions"
DROP COLUMN "textBlocks",
DROP COLUMN "answerBlocks";

ALTER TABLE "training_session_results"
DROP COLUMN "questionTextBlocks";

DROP FUNCTION question_snapshot_to_structured_content(JSONB);
DROP FUNCTION question_blocks_to_structured_content(JSONB, TEXT);
