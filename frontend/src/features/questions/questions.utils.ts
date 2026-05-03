import type {
  DifficultyValue,
  QuestionCodeLanguage,
  QuestionStructuredContent,
  QuestionStructuredContentBlock,
} from './questions.types';

const difficultyLabels: Record<DifficultyValue, string> = {
  junior: 'Джун',
  middle: 'Мидл',
  senior: 'Сеньор',
  lead: 'Лид',
};

export const QUESTION_TEXT_PLAIN_LENGTH_LIMIT = 1000;
export const QUESTION_ANSWER_PLAIN_LENGTH_LIMIT = 5000;
export const QUESTION_CODE_LANGUAGES = [
  'javascript',
  'jsx',
  'typescript',
  'tsx',
  'html',
  'css',
  'vue',
] as const;

type NormalizeStructuredContentOptions = {
  fieldLabel: string;
  plainTextLimit: number;
};

type LegacyQuestionStructuredContent = {
  text?: unknown;
  code?: unknown;
  codeLanguage?: unknown;
};

export function normalizeTopicIds(topicIds: readonly string[]) {
  const normalized = new Map<string, string>();

  for (const topicId of topicIds) {
    const cleaned = topicId.trim();
    if (cleaned) {
      normalized.set(cleaned, cleaned);
    }
  }

  return Array.from(normalized.values());
}

export function formatDifficulty(value: DifficultyValue) {
  return difficultyLabels[value];
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function createQuestionTextBlock(content = '') {
  return {
    kind: 'text',
    content,
  } satisfies QuestionStructuredContentBlock;
}

export function createQuestionCodeBlock(
  content = '',
  language: QuestionCodeLanguage = 'typescript',
) {
  return {
    kind: 'code',
    content,
    language,
  } satisfies QuestionStructuredContentBlock;
}

export function createQuestionStructuredContent(text = ''): QuestionStructuredContent {
  return [createQuestionTextBlock(text)];
}

export function cloneQuestionStructuredContent(
  content: QuestionStructuredContent,
): QuestionStructuredContent {
  return content.map((block) => {
    if (block.kind === 'text') {
      return createQuestionTextBlock(block.content ?? '');
    }

    return {
      kind: 'code',
      content: block.content ?? '',
      ...(block.language ? { language: block.language } : {}),
    };
  });
}

export function ensureQuestionStructuredContent(
  content: QuestionStructuredContent | LegacyQuestionStructuredContent | null | undefined,
  fallbackText = '',
): QuestionStructuredContent {
  if (Array.isArray(content)) {
    const blocks: QuestionStructuredContent = [];

    for (const block of content) {
      if (!block || typeof block !== 'object') {
        continue;
      }

      if (block.kind === 'text') {
        blocks.push(createQuestionTextBlock(String(block.content ?? '')));
        continue;
      }

      if (block.kind === 'code') {
        blocks.push({
          kind: 'code',
          content: String(block.content ?? ''),
          ...(block.language ? { language: block.language } : {}),
        });
      }
    }

    const cloned = compactStructuredContentBlocks(blocks);

    return cloned.length > 0 ? cloned : createQuestionStructuredContent(fallbackText.trim());
  }

  if (isLegacyStructuredContent(content)) {
    const blocks: QuestionStructuredContent = [];
    const text = normalizeNewlines(String(content.text ?? '')).trim();
    const code =
      typeof content.code === 'string' ? normalizeNewlines(content.code).replace(/^\n+|\n+$/g, '') : '';
    const language = normalizeCodeLanguage(
      typeof content.codeLanguage === 'string' ? content.codeLanguage : undefined,
      'Контент вопроса',
    );

    if (text) {
      blocks.push(createQuestionTextBlock(text));
    }

    if (code) {
      blocks.push({
        kind: 'code',
        content: code,
        ...(language ? { language } : {}),
      });
    }

    if (blocks.length > 0) {
      return blocks;
    }
  }

  if (fallbackText.trim()) {
    return createQuestionStructuredContent(fallbackText.trim());
  }

  return createQuestionStructuredContent();
}

export function joinQuestionStructuredContent(
  content: QuestionStructuredContent,
) {
  return content.map((block) => block.content).join('\n\n');
}

export function normalizeQuestionStructuredContent(
  content: QuestionStructuredContent,
  options: NormalizeStructuredContentOptions,
): QuestionStructuredContent {
  const blocksToNormalize: QuestionStructuredContent = [];

  for (const block of content) {
    if (!block || typeof block !== 'object') {
      continue;
    }

    if (block.kind === 'text') {
      const normalizedText = normalizeNewlines(block.content ?? '').trim();

      if (normalizedText) {
        blocksToNormalize.push(createQuestionTextBlock(normalizedText));
      }

      continue;
    }

    if (block.kind === 'code') {
      const normalizedCode = normalizeNewlines(block.content ?? '').replace(/^\n+|\n+$/g, '');

      if (!normalizedCode.trim()) {
        continue;
      }

      const language = normalizeCodeLanguage(block.language, options.fieldLabel);

      blocksToNormalize.push({
        kind: 'code',
        content: normalizedCode,
        ...(language ? { language } : {}),
      });
    }
  }

  const normalizedBlocks = compactStructuredContentBlocks(blocksToNormalize);

  if (normalizedBlocks.length === 0) {
    throw new Error(`${options.fieldLabel}: нужен хотя бы один непустой блок.`);
  }

  if (joinQuestionStructuredContent(normalizedBlocks).length > options.plainTextLimit) {
    throw new Error(
      `${options.fieldLabel} превышает лимит ${options.plainTextLimit} символов.`,
    );
  }

  return normalizedBlocks;
}

function compactStructuredContentBlocks(value: QuestionStructuredContent) {
  const compact: QuestionStructuredContent = [];

  for (const block of value) {
    const previous = compact.length > 0 ? compact[compact.length - 1] : null;

    if (
      previous &&
      previous.kind === block.kind &&
      (
        block.kind === 'text' ||
        (previous.kind === 'code' &&
          (previous.language === block.language ||
            !previous.language ||
            !block.language))
      )
    ) {
      previous.content = `${previous.content}\n\n${block.content}`;

      if (block.kind === 'code' && previous.kind === 'code') {
        previous.language = previous.language ?? block.language;
      }

      continue;
    }

    compact.push(
      block.kind === 'text'
        ? createQuestionTextBlock(block.content)
        : {
            kind: 'code',
            content: block.content,
            ...(block.language ? { language: block.language } : {}),
          },
    );
  }

  return compact;
}

function normalizeCodeLanguage(
  value: string | undefined,
  fieldLabel: string,
) {
  const normalized = value?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return '';
  }

  if (!QUESTION_CODE_LANGUAGES.includes(normalized as QuestionCodeLanguage)) {
    throw new Error(
      `${fieldLabel}: язык кода должен быть одним из ${QUESTION_CODE_LANGUAGES.join(', ')}.`,
    );
  }

  return normalized as QuestionCodeLanguage;
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

function isLegacyStructuredContent(
  value: unknown,
): value is LegacyQuestionStructuredContent {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
