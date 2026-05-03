export type InterviewGrowthAreaResult = 'correct' | 'partial' | 'incorrect';

export type InterviewGrowthAreaCriterionInput = {
  title: string;
  competencyName?: string | null;
  result: InterviewGrowthAreaResult;
  comment?: string | null;
  isGrowthPoint?: boolean | null;
  growthArea?: string | null;
};

export type InterviewGrowthAreasInput = {
  manualGrowthAreas?: string | null;
  criteria: InterviewGrowthAreaCriterionInput[];
};

const GROWTH_AREAS_LENGTH_LIMIT = 4000;
const CRITERION_GROWTH_AREA_LENGTH_LIMIT = 1000;

export function buildCriterionGrowthArea(
  criterion: InterviewGrowthAreaCriterionInput,
) {
  const manual = normalizeText(criterion.growthArea);

  if (manual) {
    return truncateText(manual, CRITERION_GROWTH_AREA_LENGTH_LIMIT);
  }

  if (!criterion.isGrowthPoint && criterion.result === 'correct') {
    return null;
  }

  const title = formatCriterionTitle(criterion);
  const comment = normalizeText(criterion.comment);
  const text = comment
    ? `${title} - ${formatGrowthAreaResult(criterion.result)}. ${comment}`
    : `${title} - ${formatGrowthAreaResult(criterion.result)}`;

  return truncateText(text, CRITERION_GROWTH_AREA_LENGTH_LIMIT);
}

export function buildInterviewGrowthAreas(input: InterviewGrowthAreasInput) {
  const manual = normalizeText(input.manualGrowthAreas);

  if (manual) {
    return truncateText(manual, GROWTH_AREAS_LENGTH_LIMIT);
  }

  const items = input.criteria
    .map((criterion) => buildCriterionGrowthArea(criterion))
    .filter((item): item is string => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  return truncateText(items.slice(0, 8).join('\n'), GROWTH_AREAS_LENGTH_LIMIT);
}

export function shouldMarkCriterionAsGrowthPoint(
  criterion: InterviewGrowthAreaCriterionInput,
) {
  return Boolean(
    criterion.isGrowthPoint ||
      normalizeText(criterion.growthArea) ||
      criterion.result !== 'correct',
  );
}

function formatCriterionTitle(criterion: InterviewGrowthAreaCriterionInput) {
  const title = normalizeText(criterion.title) ?? 'Критерий';
  const competencyName = normalizeText(criterion.competencyName);

  return competencyName ? `${title} (${competencyName})` : title;
}

function formatGrowthAreaResult(value: InterviewGrowthAreaResult) {
  if (value === 'correct') {
    return 'засчитано';
  }

  if (value === 'partial') {
    return 'частично';
  }

  return 'не засчитано';
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
