CREATE OR REPLACE FUNCTION normalize_question_content_blocks(content JSONB, fallback_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  item JSONB;
  raw_kind TEXT;
  raw_content TEXT;
  raw_language TEXT;
  raw_text TEXT;
  raw_code TEXT;
BEGIN
  IF content IS NULL OR content = 'null'::jsonb THEN
    IF BTRIM(COALESCE(fallback_text, '')) <> '' THEN
      RETURN jsonb_build_array(
        jsonb_build_object(
          'kind',
          'text',
          'content',
          BTRIM(REGEXP_REPLACE(COALESCE(fallback_text, ''), E'\\r\\n?', E'\\n', 'g'))
        )
      );
    END IF;

    RETURN '[]'::jsonb;
  END IF;

  IF jsonb_typeof(content) = 'object' AND NOT (content ? 'kind') THEN
    raw_text := REGEXP_REPLACE(COALESCE(content ->> 'text', ''), E'\\r\\n?', E'\\n', 'g');
    raw_code := REGEXP_REPLACE(COALESCE(content ->> 'code', ''), E'\\r\\n?', E'\\n', 'g');
    raw_language := LOWER(BTRIM(COALESCE(content ->> 'codeLanguage', '')));

    IF BTRIM(raw_text) <> '' THEN
      result := result || jsonb_build_array(
        jsonb_build_object(
          'kind',
          'text',
          'content',
          BTRIM(raw_text)
        )
      );
    END IF;

    IF BTRIM(raw_code) <> '' THEN
      result := result || jsonb_build_array(
        jsonb_strip_nulls(
          jsonb_build_object(
            'kind',
            'code',
            'content',
            REGEXP_REPLACE(raw_code, E'^\\n+|\\n+$', '', 'g'),
            'language',
            CASE
              WHEN raw_language IN ('javascript', 'jsx', 'typescript', 'tsx', 'html', 'css', 'vue')
              THEN raw_language
              ELSE NULL
            END
          )
        )
      );
    END IF;

    IF jsonb_array_length(result) = 0 AND BTRIM(COALESCE(fallback_text, '')) <> '' THEN
      result := jsonb_build_array(
        jsonb_build_object(
          'kind',
          'text',
          'content',
          BTRIM(REGEXP_REPLACE(COALESCE(fallback_text, ''), E'\\r\\n?', E'\\n', 'g'))
        )
      );
    END IF;

    RETURN result;
  END IF;

  IF jsonb_typeof(content) = 'object' THEN
    content := jsonb_build_array(content);
  END IF;

  IF jsonb_typeof(content) <> 'array' THEN
    IF BTRIM(COALESCE(fallback_text, '')) <> '' THEN
      RETURN jsonb_build_array(
        jsonb_build_object(
          'kind',
          'text',
          'content',
          BTRIM(REGEXP_REPLACE(COALESCE(fallback_text, ''), E'\\r\\n?', E'\\n', 'g'))
        )
      );
    END IF;

    RETURN '[]'::jsonb;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(content)
  LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      CONTINUE;
    END IF;

    raw_kind := LOWER(BTRIM(COALESCE(item ->> 'kind', '')));

    IF raw_kind = 'text' THEN
      raw_content := REGEXP_REPLACE(
        COALESCE(item ->> 'content', item ->> 'text', ''),
        E'\\r\\n?',
        E'\\n',
        'g'
      );

      IF BTRIM(raw_content) <> '' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'kind',
            'text',
            'content',
            BTRIM(raw_content)
          )
        );
      END IF;
    ELSIF raw_kind = 'code' THEN
      raw_content := REGEXP_REPLACE(
        COALESCE(item ->> 'content', item ->> 'code', ''),
        E'\\r\\n?',
        E'\\n',
        'g'
      );
      raw_language := LOWER(BTRIM(COALESCE(item ->> 'language', item ->> 'codeLanguage', '')));

      IF BTRIM(raw_content) <> '' THEN
        result := result || jsonb_build_array(
          jsonb_strip_nulls(
            jsonb_build_object(
              'kind',
              'code',
              'content',
              REGEXP_REPLACE(raw_content, E'^\\n+|\\n+$', '', 'g'),
              'language',
              CASE
                WHEN raw_language IN ('javascript', 'jsx', 'typescript', 'tsx', 'html', 'css', 'vue')
                THEN raw_language
                ELSE NULL
              END
            )
          )
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(result) = 0 AND BTRIM(COALESCE(fallback_text, '')) <> '' THEN
    result := jsonb_build_array(
      jsonb_build_object(
        'kind',
        'text',
        'content',
        BTRIM(REGEXP_REPLACE(COALESCE(fallback_text, ''), E'\\r\\n?', E'\\n', 'g'))
      )
    );
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_question_snapshot_content(snapshot JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF snapshot IS NULL OR jsonb_typeof(snapshot) <> 'object' THEN
    RETURN snapshot;
  END IF;

  RETURN (
    snapshot - 'textBlocks' - 'answerBlocks'
  ) || jsonb_build_object(
    'textContent',
    normalize_question_content_blocks(
      COALESCE(snapshot -> 'textContent', snapshot -> 'textBlocks'),
      snapshot ->> 'text'
    ),
    'answerContent',
    normalize_question_content_blocks(
      COALESCE(snapshot -> 'answerContent', snapshot -> 'answerBlocks'),
      snapshot ->> 'answer'
    )
  );
END;
$$;

UPDATE "questions"
SET
  "textContent" = normalize_question_content_blocks("textContent", "text"),
  "answerContent" = normalize_question_content_blocks("answerContent", "answer");

UPDATE "training_session_results"
SET
  "questionTextContent" = normalize_question_content_blocks(
    "questionTextContent",
    "questionText"
  );

UPDATE "question_change_requests"
SET
  "baseSnapshot" = normalize_question_snapshot_content("baseSnapshot"),
  "proposedSnapshot" = normalize_question_snapshot_content("proposedSnapshot");

DROP FUNCTION normalize_question_snapshot_content(JSONB);
DROP FUNCTION normalize_question_content_blocks(JSONB, TEXT);
