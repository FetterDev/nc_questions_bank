import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const QUESTION_CODE_LANGUAGES = [
  'javascript',
  'jsx',
  'typescript',
  'tsx',
  'html',
  'css',
  'vue',
] as const;

export type QuestionCodeLanguage =
  (typeof QUESTION_CODE_LANGUAGES)[number];

export type QuestionTextContentBlock = {
  kind: 'text';
  content: string;
};

export type QuestionCodeContentBlock = {
  kind: 'code';
  content: string;
  language?: QuestionCodeLanguage;
};

export type QuestionContentBlock =
  | QuestionTextContentBlock
  | QuestionCodeContentBlock;

export type QuestionStructuredContent = QuestionContentBlock[];

export const QUESTION_TEXT_PLAIN_LENGTH_LIMIT = 1000;
export const QUESTION_ANSWER_PLAIN_LENGTH_LIMIT = 5000;

type NormalizeStructuredContentOptions = {
  fieldLabel: string;
  plainTextLimit: number;
};

type LegacyStructuredContentObject = {
  text?: unknown;
  code?: unknown;
  codeLanguage?: unknown;
};

type LegacyQuestionContentBlock = {
  kind?: unknown;
  content?: unknown;
  language?: unknown;
  text?: unknown;
  code?: unknown;
  codeLanguage?: unknown;
};

export function normalizeQuestionStructuredContent(
  value: unknown,
  options: NormalizeStructuredContentOptions,
): QuestionStructuredContent {
  const blocks = Array.isArray(value)
    ? normalizeStructuredContentBlocks(value, options)
    : isRecord(value)
      ? normalizeLegacyStructuredContentObject(value, options)
      : null;

  if (!blocks) {
    throw new BadRequestException(`${options.fieldLabel} content must be an array`);
  }

  if (joinQuestionStructuredContent(blocks).length > options.plainTextLimit) {
    throw new BadRequestException(
      `${options.fieldLabel} plain text exceeds ${options.plainTextLimit} characters`,
    );
  }

  return blocks;
}

export function coerceQuestionStructuredContent(
  value: unknown,
  fallbackText?: string | null,
): QuestionStructuredContent | null {
  if (Array.isArray(value)) {
    const blocks = coerceStructuredContentBlocks(value);
    if (blocks.length > 0) {
      return blocks;
    }
  }

  if (isRecord(value)) {
    const blocks = coerceLegacyStructuredContentObject(value, fallbackText);
    if (blocks.length > 0) {
      return blocks;
    }
  }

  const text = normalizeLegacyText(fallbackText ?? '');
  return text ? [{ kind: 'text', content: text }] : null;
}

export function joinQuestionStructuredContent(
  value: QuestionStructuredContent,
) {
  return value.map((block) => block.content).join('\n\n');
}

export function toQuestionStructuredContentJson(
  value: QuestionStructuredContent,
) {
  return value as Prisma.InputJsonValue;
}

export function canonicalizeQuestionStructuredContent(
  value: QuestionStructuredContent,
) {
  return value.map((block) =>
    block.kind === 'text'
      ? {
          kind: 'text' as const,
          content: block.content,
        }
      : {
          kind: 'code' as const,
          content: block.content,
          language: block.language ?? null,
        },
  );
}

export function getQuestionStructuredContentText(value: QuestionStructuredContent) {
  return value
    .filter(
      (block): block is QuestionTextContentBlock => block.kind === 'text',
    )
    .map((block) => block.content)
    .join('\n\n');
}

export function getQuestionStructuredContentCode(value: QuestionStructuredContent) {
  return value
    .filter(
      (block): block is QuestionCodeContentBlock => block.kind === 'code',
    )
    .map((block) => block.content)
    .join('\n\n');
}

export function getQuestionStructuredContentCodeLanguage(
  value: QuestionStructuredContent,
) {
  const languages = new Set(
    value
      .filter(
        (block): block is QuestionCodeContentBlock =>
          block.kind === 'code' && Boolean(block.language),
      )
      .map((block) => block.language as QuestionCodeLanguage),
  );

  if (languages.size !== 1) {
    return null;
  }

  return Array.from(languages)[0];
}

function normalizeStructuredContentBlocks(
  value: unknown[],
  options: NormalizeStructuredContentOptions,
) {
  const normalizedBlocks = value.flatMap((item, index) => {
    const fieldLabel = `${options.fieldLabel} block #${index + 1}`;
    const normalized = normalizeStructuredContentBlock(item, fieldLabel);
    return normalized ? [normalized] : [];
  });

  if (normalizedBlocks.length === 0) {
    throw new BadRequestException(
      `${options.fieldLabel} must contain at least one non-empty block`,
    );
  }

  return normalizedBlocks;
}

function normalizeLegacyStructuredContentObject(
  value: Record<string, unknown>,
  options: NormalizeStructuredContentOptions,
) {
  const rawText =
    typeof value.text === 'string' ? normalizeNewlines(value.text) : null;
  const rawCode =
    value.code === undefined || value.code === null
      ? null
      : typeof value.code === 'string'
        ? normalizeNewlines(value.code)
        : null;

  if (rawText === null) {
    throw new BadRequestException(`${options.fieldLabel} text must be a string`);
  }

  if (value.code !== undefined && value.code !== null && rawCode === null) {
    throw new BadRequestException(`${options.fieldLabel} code must be a string`);
  }

  const blocks: QuestionStructuredContent = [];
  const text = rawText.trim();
  const code = rawCode && rawCode.trim() ? rawCode : '';

  if (text) {
    blocks.push({
      kind: 'text',
      content: text,
    });
  }

  if (code) {
    blocks.push({
      kind: 'code',
      content: code,
      ...withOptionalLanguage(
        normalizeCodeLanguage(value.codeLanguage, options.fieldLabel),
      ),
    });
  } else if (value.codeLanguage !== undefined && value.codeLanguage !== null) {
    throw new BadRequestException(
      `${options.fieldLabel} codeLanguage requires non-empty code`,
    );
  }

  if (blocks.length === 0) {
    throw new BadRequestException(
      `${options.fieldLabel} must contain at least one non-empty block`,
    );
  }

  return blocks;
}

function normalizeStructuredContentBlock(
  value: unknown,
  fieldLabel: string,
): QuestionContentBlock | null {
  if (!isRecord(value)) {
    throw new BadRequestException(`${fieldLabel} must be an object`);
  }

  const kind =
    typeof value.kind === 'string' ? value.kind.trim().toLowerCase() : '';

  if (kind !== 'text' && kind !== 'code') {
    throw new BadRequestException(`${fieldLabel} kind must be 'text' or 'code'`);
  }

  const rawContent =
    typeof value.content === 'string' ? normalizeNewlines(value.content) : null;

  if (rawContent === null) {
    throw new BadRequestException(`${fieldLabel} content must be a string`);
  }

  if (kind === 'text') {
    const content = rawContent.trim();

    if (!content) {
      return null;
    }

    if (value.language !== undefined && value.language !== null) {
      throw new BadRequestException(`${fieldLabel} language is allowed only for code`);
    }

    return {
      kind: 'text',
      content,
    };
  }

  const content = rawContent.trim() ? rawContent : '';

  if (!content) {
    return null;
  }

  return {
    kind: 'code',
    content,
    ...withOptionalLanguage(
      normalizeCodeLanguage(value.language ?? value.codeLanguage, fieldLabel),
    ),
  };
}

function coerceStructuredContentBlocks(value: unknown[]) {
  const blocks: QuestionStructuredContent = [];

  for (const item of value) {
    const normalized = coerceStructuredContentBlock(item);

    if (normalized) {
      blocks.push(normalized);
    }
  }

  return blocks;
}

function coerceLegacyStructuredContentObject(
  value: Record<string, unknown>,
  fallbackText?: string | null,
) {
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

  const blocks: QuestionStructuredContent = [];

  if (text) {
    blocks.push({
      kind: 'text',
      content: text,
    });
  }

  if (code) {
    blocks.push({
      kind: 'code',
      content: code,
      ...withOptionalLanguage(codeLanguage),
    });
  }

  return blocks;
}

function coerceStructuredContentBlock(
  value: unknown,
): QuestionContentBlock | null {
  if (!isRecord(value)) {
    return null;
  }

  const block = value as LegacyQuestionContentBlock;
  const kind =
    typeof block.kind === 'string' ? block.kind.trim().toLowerCase() : '';

  if (kind === 'text') {
    const rawContent =
      typeof block.content === 'string'
        ? block.content
        : typeof block.text === 'string'
          ? block.text
          : '';
    const content = normalizeLegacyText(rawContent);

    return content
      ? {
          kind: 'text',
          content,
        }
      : null;
  }

  if (kind === 'code') {
    const rawContent =
      typeof block.content === 'string'
        ? normalizeNewlines(block.content)
        : typeof block.code === 'string'
          ? normalizeNewlines(block.code)
          : '';

    if (!rawContent.trim()) {
      return null;
    }

    const language = normalizeLegacyCodeLanguage(
      typeof block.language === 'string'
        ? block.language
        : typeof block.codeLanguage === 'string'
          ? block.codeLanguage
          : '',
    );

    return {
      kind: 'code',
      content: rawContent,
      ...withOptionalLanguage(language),
    };
  }

  return null;
}

function normalizeCodeLanguage(value: unknown, fieldLabel: string) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldLabel} language must be a string`);
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  if (!QUESTION_CODE_LANGUAGES.includes(normalized as QuestionCodeLanguage)) {
    throw new BadRequestException(
      `${fieldLabel} language must be one of: ${QUESTION_CODE_LANGUAGES.join(', ')}`,
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

function withOptionalLanguage(language: string) {
  return language ? { language: language as QuestionCodeLanguage } : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
