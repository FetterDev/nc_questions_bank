import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const QUESTION_CODE_LANGUAGES = [
  'javascript',
  'jsx',
  'typescript',
  'tsx',
] as const;

export type QuestionCodeLanguage =
  (typeof QUESTION_CODE_LANGUAGES)[number];

export type QuestionStructuredContent = {
  text: string;
  code?: string;
  codeLanguage?: QuestionCodeLanguage;
};

export const QUESTION_TEXT_PLAIN_LENGTH_LIMIT = 1000;
export const QUESTION_ANSWER_PLAIN_LENGTH_LIMIT = 5000;

type NormalizeStructuredContentOptions = {
  fieldLabel: string;
  plainTextLimit: number;
};

type LegacyQuestionContentBlock = {
  kind?: unknown;
  content?: unknown;
  language?: unknown;
};

export function normalizeQuestionStructuredContent(
  value: unknown,
  options: NormalizeStructuredContentOptions,
): QuestionStructuredContent {
  if (!isRecord(value)) {
    throw new BadRequestException(`${options.fieldLabel} content must be an object`);
  }

  const rawText = typeof value.text === 'string' ? normalizeNewlines(value.text) : null;

  if (rawText === null) {
    throw new BadRequestException(`${options.fieldLabel} text must be a string`);
  }

  const text = rawText.trim();

  if (!text) {
    throw new BadRequestException(`${options.fieldLabel} text must not be empty`);
  }

  const rawCode =
    value.code === undefined || value.code === null
      ? null
      : typeof value.code === 'string'
        ? normalizeNewlines(value.code)
        : null;

  if (value.code !== undefined && value.code !== null && rawCode === null) {
    throw new BadRequestException(`${options.fieldLabel} code must be a string`);
  }

  const code = rawCode && rawCode.trim() ? rawCode : '';

  if (!code && value.codeLanguage !== undefined && value.codeLanguage !== null) {
    throw new BadRequestException(
      `${options.fieldLabel} codeLanguage requires non-empty code`,
    );
  }

  const codeLanguage = code
    ? normalizeCodeLanguage(value.codeLanguage, options.fieldLabel)
    : '';

  const normalized: QuestionStructuredContent = {
    text,
    ...(code ? { code } : {}),
    ...(code && codeLanguage ? { codeLanguage } : {}),
  };

  if (joinQuestionStructuredContent(normalized).length > options.plainTextLimit) {
    throw new BadRequestException(
      `${options.fieldLabel} plain text exceeds ${options.plainTextLimit} characters`,
    );
  }

  return normalized;
}

export function coerceQuestionStructuredContent(
  value: unknown,
  fallbackText?: string | null,
): QuestionStructuredContent | null {
  if (isRecord(value)) {
    const text = normalizeLegacyText(
      typeof value.text === 'string' ? value.text : fallbackText ?? '',
    );
    const code =
      typeof value.code === 'string' && value.code.trim()
        ? normalizeNewlines(value.code)
        : '';
    const codeLanguage = normalizeLegacyCodeLanguage(
      typeof value.codeLanguage === 'string' ? value.codeLanguage : '',
    );

    if (!text) {
      return null;
    }

    return {
      text,
      ...(code ? { code } : {}),
      ...(code && codeLanguage ? { codeLanguage } : {}),
    };
  }

  if (Array.isArray(value)) {
    return coerceLegacyQuestionContent(value, fallbackText);
  }

  const text = normalizeLegacyText(fallbackText ?? '');

  return text ? { text } : null;
}

export function joinQuestionStructuredContent(
  value: QuestionStructuredContent,
) {
  return value.code ? `${value.text}\n\n${value.code}` : value.text;
}

export function toQuestionStructuredContentJson(
  value: QuestionStructuredContent,
) {
  return value as Prisma.InputJsonValue;
}

export function canonicalizeQuestionStructuredContent(
  value: QuestionStructuredContent,
) {
  return {
    text: value.text,
    code: value.code ?? null,
    codeLanguage: value.codeLanguage ?? null,
  };
}

function coerceLegacyQuestionContent(
  value: unknown[],
  fallbackText?: string | null,
): QuestionStructuredContent | null {
  const textParts: string[] = [];
  const codeParts: string[] = [];
  const languages = new Set<QuestionCodeLanguage>();

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const block = item as LegacyQuestionContentBlock;
    const kind = block.kind;
    const rawContent =
      typeof block.content === 'string' ? normalizeNewlines(block.content) : '';

    if (kind === 'text') {
      const normalizedText = rawContent.trim();

      if (normalizedText) {
        textParts.push(normalizedText);
      }
      continue;
    }

    if (kind === 'code' && rawContent.trim()) {
      codeParts.push(rawContent);

      const codeLanguage = normalizeLegacyCodeLanguage(
        typeof block.language === 'string' ? block.language : '',
      );

      if (codeLanguage) {
        languages.add(codeLanguage);
      }
    }
  }

  const text = textParts.join('\n\n') || normalizeLegacyText(fallbackText ?? '');

  if (!text) {
    return null;
  }

  const code = codeParts.join('\n\n');
  const codeLanguage = code && languages.size === 1 ? Array.from(languages)[0] : '';

  return {
    text,
    ...(code ? { code } : {}),
    ...(code && codeLanguage ? { codeLanguage } : {}),
  };
}

function normalizeCodeLanguage(value: unknown, fieldLabel: string) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldLabel} codeLanguage must be a string`);
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  if (!QUESTION_CODE_LANGUAGES.includes(normalized as QuestionCodeLanguage)) {
    throw new BadRequestException(
      `${fieldLabel} codeLanguage must be one of: ${QUESTION_CODE_LANGUAGES.join(', ')}`,
    );
  }

  return normalized as QuestionCodeLanguage;
}

function normalizeLegacyCodeLanguage(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  return QUESTION_CODE_LANGUAGES.includes(normalized as QuestionCodeLanguage)
    ? (normalized as QuestionCodeLanguage)
    : '';
}

function normalizeLegacyText(value: string) {
  return normalizeNewlines(value).trim();
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
