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

export type QuestionSnapshotCompetency = {
  id: string;
  name: string;
  slug: string;
  stack: {
    id: string;
    name: string;
    slug: string;
  };
};

export type QuestionSnapshotEvaluationCriterion = {
  title: string;
  description: string | null;
  weight: number;
  position: number;
  competency: QuestionSnapshotCompetency | null;
};

export type QuestionSnapshot = {
  text: string;
  answer: string;
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
  company: QuestionSnapshotCompany | null;
  topics: QuestionSnapshotTopic[];
  competencies: QuestionSnapshotCompetency[];
  evaluationCriteria: QuestionSnapshotEvaluationCriterion[];
};

export type QuestionDraftPayload = {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
  topicIds: string[];
  companyId?: string | null;
  competencyIds?: string[];
  evaluationCriteria?: Array<{
    title: string;
    description?: string | null;
    weight?: number;
    competencyId?: string | null;
  }>;
};

export type NormalizedQuestionPayload = {
  text: string;
  answer: string;
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficultyRank: QuestionDifficultyRank;
  companyId: string | null;
  topicIds: string[];
  competencyIds: string[];
  evaluationCriteria: Array<{
    title: string;
    description: string | null;
    weight: number;
    position: number;
    competencyId: string | null;
  }>;
  snapshot: QuestionSnapshot;
};

export function normalizeQuestionPayload(
  payload: QuestionDraftPayload,
  topics: QuestionSnapshotTopic[],
  company: QuestionSnapshotCompany | null,
  competencies: QuestionSnapshotCompetency[] = [],
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
  const normalizedCompetencyIds = normalizeOptionalIdList(payload.competencyIds ?? []);
  const snapshotCompetencies = sortCompetencies(competencies);

  if (snapshotTopics.length !== normalizedTopicIds.length) {
    throw new BadRequestException('Question topics are invalid');
  }

  if (snapshotCompetencies.length !== normalizedCompetencyIds.length) {
    throw new BadRequestException('Question competencies are invalid');
  }

  const evaluationCriteria = normalizeQuestionEvaluationCriteria(
    payload.evaluationCriteria ?? [],
    snapshotCompetencies,
  );

  return {
    text,
    answer,
    textContent,
    answerContent,
    difficultyRank: toDifficultyRank(payload.difficulty),
    companyId: company?.id ?? null,
    topicIds: snapshotTopics.map((topic) => topic.id),
    competencyIds: snapshotCompetencies.map((competency) => competency.id),
    evaluationCriteria: evaluationCriteria.map((criterion) => ({
      title: criterion.title,
      description: criterion.description,
      weight: criterion.weight,
      position: criterion.position,
      competencyId: criterion.competency?.id ?? null,
    })),
    snapshot: {
      text,
      answer,
      textContent,
      answerContent,
      difficulty: payload.difficulty,
      company,
      topics: snapshotTopics,
      competencies: snapshotCompetencies,
      evaluationCriteria,
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
    | 'competencies'
    | 'evaluationCriteria'
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
    competencies: sortCompetencies(
      question.competencies.map((competency) => ({
        id: competency.id,
        name: competency.name,
        slug: competency.slug,
        stack: {
          id: competency.stack.id,
          name: competency.stack.name,
          slug: competency.stack.slug,
        },
      })),
    ),
    evaluationCriteria: question.evaluationCriteria.map((criterion) => ({
      title: criterion.title,
      description: criterion.description,
      weight: criterion.weight,
      position: criterion.position,
      competency: criterion.competency
        ? {
            id: criterion.competency.id,
            name: criterion.competency.name,
            slug: criterion.competency.slug,
            stack: {
              id: criterion.competency.stack.id,
              name: criterion.competency.stack.name,
              slug: criterion.competency.stack.slug,
            },
          }
        : null,
    })),
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
  const competencies = Array.isArray(candidate.competencies)
    ? candidate.competencies
        .map((competency) => coerceQuestionSnapshotCompetency(competency))
        .filter((competency): competency is QuestionSnapshotCompetency => competency !== null)
    : [];
  const evaluationCriteria = Array.isArray(candidate.evaluationCriteria)
    ? candidate.evaluationCriteria
        .map((criterion, index) =>
          coerceQuestionSnapshotEvaluationCriterion(criterion, competencies, index),
        )
        .filter((criterion): criterion is QuestionSnapshotEvaluationCriterion => criterion !== null)
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
    competencies: sortCompetencies(competencies),
    evaluationCriteria: sortEvaluationCriteria(evaluationCriteria),
  };
}

export function extractTopicIdsFromSnapshot(snapshot: QuestionSnapshot) {
  if (snapshot.topics.some((topic) => isLegacyTopicId(topic.id))) {
    return null;
  }

  return snapshot.topics.map((topic) => topic.id);
}

export function extractCompetencyIdsFromSnapshot(snapshot: QuestionSnapshot) {
  return snapshot.competencies.map((competency) => competency.id);
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

export function normalizeCompetencyIds(competencyIds: string[]) {
  return normalizeOptionalIdList(competencyIds);
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
    competencies: sortCompetencies(snapshot.competencies).map((competency) => ({
      name: competency.name,
      slug: competency.slug,
      stack: {
        name: competency.stack.name,
        slug: competency.stack.slug,
      },
    })),
    evaluationCriteria: sortEvaluationCriteria(snapshot.evaluationCriteria).map(
      (criterion) => ({
        title: criterion.title,
        description: criterion.description,
        weight: criterion.weight,
        position: criterion.position,
        competency: criterion.competency
          ? {
              name: criterion.competency.name,
              slug: criterion.competency.slug,
              stack: {
                name: criterion.competency.stack.name,
                slug: criterion.competency.stack.slug,
              },
            }
          : null,
      }),
    ),
  };
}

function sortTopics(topics: QuestionSnapshotTopic[]) {
  return [...topics].sort((left, right) =>
    left.slug.localeCompare(right.slug, 'ru-RU'),
  );
}

function sortCompetencies(competencies: QuestionSnapshotCompetency[]) {
  return [...competencies].sort(
    (left, right) =>
      left.stack.slug.localeCompare(right.stack.slug, 'ru-RU') ||
      left.slug.localeCompare(right.slug, 'ru-RU'),
  );
}

function sortEvaluationCriteria(criteria: QuestionSnapshotEvaluationCriterion[]) {
  return [...criteria].sort(
    (left, right) =>
      left.position - right.position ||
      left.title.localeCompare(right.title, 'ru-RU'),
  );
}

function normalizeOptionalIdList(values: string[]) {
  const unique = new Map<string, string>();

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : '';

    if (!normalized) {
      continue;
    }

    unique.set(normalized, normalized);
  }

  return Array.from(unique.values());
}

export function normalizeQuestionEvaluationCriteria(
  values: NonNullable<QuestionDraftPayload['evaluationCriteria']>,
  competencies: QuestionSnapshotCompetency[],
) {
  if (values.length > 12) {
    throw new BadRequestException('Question evaluation criteria limit is 12');
  }

  const competenciesById = new Map(competencies.map((item) => [item.id, item]));

  return values.map((value, index) => {
    const title = typeof value.title === 'string' ? value.title.trim() : '';

    if (!title) {
      throw new BadRequestException('Question evaluation criterion title cannot be empty');
    }

    if (title.length > 160) {
      throw new BadRequestException('Question evaluation criterion title is too long');
    }

    const description = typeof value.description === 'string'
      ? value.description.trim()
      : '';

    if (description.length > 2000) {
      throw new BadRequestException('Question evaluation criterion description is too long');
    }

    const weight = value.weight ?? 1;

    if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
      throw new BadRequestException('Question evaluation criterion weight is invalid');
    }

    const competencyId = typeof value.competencyId === 'string'
      ? value.competencyId.trim()
      : '';
    const competency = competencyId
      ? competenciesById.get(competencyId) ?? null
      : null;

    if (competencyId && !competency) {
      throw new BadRequestException('Question evaluation criterion competency is invalid');
    }

    return {
      title,
      description: description || null,
      weight,
      position: index,
      competency,
    };
  });
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

function coerceQuestionSnapshotCompetency(
  value: unknown,
): QuestionSnapshotCompetency | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const stackCandidate =
    candidate.stack && typeof candidate.stack === 'object'
      ? candidate.stack as Record<string, unknown>
      : null;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : '';
  const stackId = typeof stackCandidate?.id === 'string' ? stackCandidate.id.trim() : '';
  const stackName = typeof stackCandidate?.name === 'string' ? stackCandidate.name.trim() : '';
  const stackSlug = typeof stackCandidate?.slug === 'string' ? stackCandidate.slug.trim() : '';

  if (!id || !name || !slug || !stackId || !stackName || !stackSlug) {
    return null;
  }

  return {
    id,
    name,
    slug,
    stack: {
      id: stackId,
      name: stackName,
      slug: stackSlug,
    },
  };
}

function coerceQuestionSnapshotEvaluationCriterion(
  value: unknown,
  competencies: QuestionSnapshotCompetency[],
  fallbackPosition: number,
): QuestionSnapshotEvaluationCriterion | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const description = typeof candidate.description === 'string'
    ? candidate.description.trim()
    : '';
  const weight = typeof candidate.weight === 'number' && Number.isInteger(candidate.weight)
    ? candidate.weight
    : 1;
  const position = typeof candidate.position === 'number' && Number.isInteger(candidate.position)
    ? candidate.position
    : fallbackPosition;
  const competency = coerceQuestionSnapshotCompetency(candidate.competency);
  const fallbackCompetencyId =
    typeof candidate.competencyId === 'string' ? candidate.competencyId.trim() : '';
  const resolvedCompetency = competency ??
    competencies.find((item) => item.id === fallbackCompetencyId) ??
    null;

  if (!title) {
    return null;
  }

  return {
    title,
    description: description || null,
    weight,
    position,
    competency: resolvedCompetency,
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
