import type {
  DifficultyValue,
  QuestionCodeLanguage,
  QuestionStructuredContent,
} from './questions.types';

const difficultyLabels: Record<DifficultyValue, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
};

export const QUESTION_TEXT_PLAIN_LENGTH_LIMIT = 1000;
export const QUESTION_ANSWER_PLAIN_LENGTH_LIMIT = 5000;
export const QUESTION_CODE_LANGUAGES = [
  'javascript',
  'jsx',
  'typescript',
  'tsx',
] as const;

type NormalizeStructuredContentOptions = {
  fieldLabel: string;
  plainTextLimit: number;
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

export function createQuestionStructuredContent(
  text = '',
  code = '',
  codeLanguage?: QuestionCodeLanguage,
): QuestionStructuredContent {
  return {
    text,
    ...(code ? { code } : {}),
    ...(code && codeLanguage ? { codeLanguage } : {}),
  };
}

export function cloneQuestionStructuredContent(
  content: QuestionStructuredContent,
): QuestionStructuredContent {
  return {
    text: content.text ?? '',
    ...(content.code ? { code: content.code } : {}),
    ...(content.code && content.codeLanguage ? { codeLanguage: content.codeLanguage } : {}),
  };
}

export function ensureQuestionStructuredContent(
  content: QuestionStructuredContent | null | undefined,
  fallbackText = '',
): QuestionStructuredContent {
  if (content && typeof content === 'object') {
    return cloneQuestionStructuredContent(content);
  }

  if (fallbackText.trim()) {
    return createQuestionStructuredContent(fallbackText.trim());
  }

  return createQuestionStructuredContent();
}

export function joinQuestionStructuredContent(
  content: QuestionStructuredContent,
) {
  return content.code ? `${content.text}\n\n${content.code}` : content.text;
}

export function normalizeQuestionStructuredContent(
  content: QuestionStructuredContent,
  options: NormalizeStructuredContentOptions,
): QuestionStructuredContent {
  const normalizedText = normalizeNewlines(content.text ?? '').trim();

  if (!normalizedText) {
    throw new Error(`${options.fieldLabel}: текст обязателен.`);
  }

  const normalizedCode = normalizeNewlines(content.code ?? '');
  const code = normalizedCode.trim() ? normalizedCode : '';
  const codeLanguage = code
    ? normalizeCodeLanguage(content.codeLanguage, options.fieldLabel)
    : '';

  if (!code && content.codeLanguage) {
    throw new Error(`${options.fieldLabel}: язык кода нельзя задавать без кода.`);
  }

  const normalized = {
    text: normalizedText,
    ...(code ? { code } : {}),
    ...(code && codeLanguage ? { codeLanguage } : {}),
  } satisfies QuestionStructuredContent;

  if (joinQuestionStructuredContent(normalized).length > options.plainTextLimit) {
    throw new Error(
      `${options.fieldLabel} превышает лимит ${options.plainTextLimit} символов.`,
    );
  }

  return normalized;
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
