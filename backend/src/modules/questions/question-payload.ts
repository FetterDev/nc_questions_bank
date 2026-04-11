import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  fromDifficultyRank,
  QuestionDifficulty,
  QuestionDifficultyRank,
  toDifficultyRank,
} from './question-difficulty';
import {
  QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
  QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
  QuestionStructuredContent,
  canonicalizeQuestionStructuredContent,
  coerceQuestionStructuredContent,
  joinQuestionStructuredContent,
  normalizeQuestionStructuredContent,
  toQuestionStructuredContentJson,
} from './question-structured-content';
import { QuestionOutput } from './questions.repository';

export const LEGACY_TOPIC_ID_PREFIX = 'legacy:';

export type QuestionSnapshotTopic = {
  id: string;
  name: string;
  slug: string;
};

export type QuestionSnapshotCompany = {
  id: string;
  name: string;
};

export type QuestionSnapshot = {
  text: string;
  answer: string;
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
  company: QuestionSnapshotCompany | null;
  topics: QuestionSnapshotTopic[];
};

export type QuestionDraftPayload = {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
  topicIds: string[];
  companyId?: string | null;
};

export type NormalizedQuestionPayload = {
  text: string;
  answer: string;
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficultyRank: QuestionDifficultyRank;
  companyId: string | null;
  topicIds: string[];
  snapshot: QuestionSnapshot;
};

export function normalizeQuestionPayload(
  payload: QuestionDraftPayload,
  topics: QuestionSnapshotTopic[],
  company: QuestionSnapshotCompany | null,
): NormalizedQuestionPayload {
  const textContent = normalizeQuestionStructuredContent(payload.textContent, {
    fieldLabel: 'Question text',
    plainTextLimit: QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
  });
  const answerContent = normalizeQuestionStructuredContent(payload.answerContent, {
    fieldLabel: 'Question answer',
    plainTextLimit: QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
  });
  const text = joinQuestionStructuredContent(textContent);
  const answer = joinQuestionStructuredContent(answerContent);

  const normalizedTopicIds = normalizeTopicIds(payload.topicIds);
  const snapshotTopics = sortTopics(topics);

  if (snapshotTopics.length !== normalizedTopicIds.length) {
    throw new BadRequestException('Question topics are invalid');
  }

  return {
    text,
    answer,
    textContent,
    answerContent,
    difficultyRank: toDifficultyRank(payload.difficulty),
    companyId: company?.id ?? null,
    topicIds: snapshotTopics.map((topic) => topic.id),
    snapshot: {
      text,
      answer,
      textContent,
      answerContent,
      difficulty: payload.difficulty,
      company,
      topics: snapshotTopics,
    },
  };
}

export function buildQuestionSnapshot(
  question: Pick<
    QuestionOutput,
    | 'text'
    | 'answer'
    | 'textContent'
    | 'answerContent'
    | 'difficulty'
    | 'company'
    | 'topics'
  >,
): QuestionSnapshot {
  return {
    text: question.text,
    answer: question.answer,
    textContent: question.textContent,
    answerContent: question.answerContent,
    difficulty: fromDifficultyRank(question.difficulty),
    company: question.company
      ? {
          id: question.company.id,
          name: question.company.name,
        }
      : null,
    topics: sortTopics(
      question.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
      })),
    ),
  };
}

export function snapshotsEqual(
  left: QuestionSnapshot | null,
  right: QuestionSnapshot | null,
) {
  return (
    JSON.stringify(canonicalizeSnapshot(left)) ===
    JSON.stringify(canonicalizeSnapshot(right))
  );
}

export function toJsonSnapshot(snapshot: QuestionSnapshot | null) {
  if (snapshot === null) {
    return Prisma.DbNull;
  }

  return {
    ...snapshot,
    textContent: toQuestionStructuredContentJson(snapshot.textContent),
    answerContent: toQuestionStructuredContentJson(snapshot.answerContent),
  } as Prisma.InputJsonValue;
}

export function coerceQuestionSnapshot(value: unknown): QuestionSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const fallbackText = typeof candidate.text === 'string' ? candidate.text : null;
  const fallbackAnswer =
    typeof candidate.answer === 'string' ? candidate.answer : null;
  const textContent = coerceQuestionStructuredContent(
    candidate.textContent ?? candidate.textBlocks,
    fallbackText,
  );
  const answerContent = coerceQuestionStructuredContent(
    candidate.answerContent ?? candidate.answerBlocks,
    fallbackAnswer,
  );
  const text = textContent ? joinQuestionStructuredContent(textContent) : null;
  const answer = answerContent ? joinQuestionStructuredContent(answerContent) : null;
  const difficulty =
    typeof candidate.difficulty === 'string'
      ? (candidate.difficulty as QuestionDifficulty)
      : null;
  const company = coerceQuestionSnapshotCompany(candidate.company);
  const topics = Array.isArray(candidate.topics)
    ? candidate.topics
        .map((topic) => coerceQuestionSnapshotTopic(topic))
        .filter((topic): topic is QuestionSnapshotTopic => topic !== null)
    : [];

  if (!text || !answer || !difficulty || !textContent || !answerContent) {
    return null;
  }

  return {
    text,
    answer,
    textContent,
    answerContent,
    difficulty,
    company,
    topics: sortTopics(topics),
  };
}

export function extractTopicIdsFromSnapshot(snapshot: QuestionSnapshot) {
  if (snapshot.topics.some((topic) => isLegacyTopicId(topic.id))) {
    return null;
  }

  return snapshot.topics.map((topic) => topic.id);
}

export function normalizeTopicIds(topicIds: string[]) {
  const unique = new Map<string, string>();

  for (const topicId of topicIds) {
    const normalized = topicId.trim();

    if (!normalized) {
      continue;
    }

    unique.set(normalized, normalized);
  }

  if (unique.size === 0) {
    throw new BadRequestException('At least one topic is required');
  }

  return Array.from(unique.values());
}

function canonicalizeSnapshot(snapshot: QuestionSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  return {
    text: snapshot.text,
    answer: snapshot.answer,
    textContent: canonicalizeQuestionStructuredContent(snapshot.textContent),
    answerContent: canonicalizeQuestionStructuredContent(snapshot.answerContent),
    difficulty: snapshot.difficulty,
    company: snapshot.company
      ? {
          id: snapshot.company.id,
          name: snapshot.company.name,
        }
      : null,
    topics: sortTopics(snapshot.topics).map((topic) => ({
      name: topic.name,
      slug: topic.slug,
    })),
  };
}

function sortTopics(topics: QuestionSnapshotTopic[]) {
  return [...topics].sort((left, right) =>
    left.slug.localeCompare(right.slug, 'ru-RU'),
  );
}

function coerceQuestionSnapshotTopic(value: unknown): QuestionSnapshotTopic | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : '';
  const rawId = typeof candidate.id === 'string' ? candidate.id.trim() : '';

  if (!name || !slug) {
    return null;
  }

  return {
    id: rawId || toLegacyTopicId(slug),
    name,
    slug,
  };
}

function coerceQuestionSnapshotCompany(
  value: unknown,
): QuestionSnapshotCompany | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';

  if (!name) {
    return null;
  }

  return {
    id,
    name,
  };
}

export function toLegacyTopicId(slug: string) {
  return `${LEGACY_TOPIC_ID_PREFIX}${slug}`;
}

export function isLegacyTopicId(topicId: string) {
  return topicId.startsWith(LEGACY_TOPIC_ID_PREFIX);
}
