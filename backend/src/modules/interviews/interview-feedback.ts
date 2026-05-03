export type InterviewFeedbackResult = 'correct' | 'partial' | 'incorrect';

export type InterviewFeedbackCriterionInput = {
  title: string;
  competencyName?: string | null;
  result: InterviewFeedbackResult;
  comment?: string | null;
};

export type InterviewFeedbackInput = {
  resultsCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  criteria: InterviewFeedbackCriterionInput[];
};

const FEEDBACK_LENGTH_LIMIT = 4000;

export function buildInterviewFeedback(input: InterviewFeedbackInput) {
  const summary = `Итог: ${input.correctCount} correct, ${input.partialCount} partial, ${input.incorrectCount} incorrect из ${input.resultsCount}.`;
  const strengths = input.criteria
    .filter((criterion) => criterion.result === 'correct')
    .slice(0, 3)
    .map((criterion) => formatCriterionTitle(criterion));
  const growthAreas = input.criteria
    .filter((criterion) => criterion.result !== 'correct')
    .slice(0, 5)
    .map((criterion) => `${formatCriterionTitle(criterion)} - ${criterion.result}`);
  const comments = input.criteria
    .map((criterion) => ({
      title: criterion.title.trim(),
      comment: criterion.comment?.trim() ?? '',
    }))
    .filter((criterion) => criterion.title && criterion.comment)
    .slice(0, 5)
    .map((criterion) => `${criterion.title}: ${criterion.comment}`);
  const parts = [summary];

  if (strengths.length > 0) {
    parts.push(`Сильные зоны: ${strengths.join('; ')}.`);
  }

  if (growthAreas.length > 0) {
    parts.push(`Зоны роста: ${growthAreas.join('; ')}.`);
  } else if (input.partialCount > 0 || input.incorrectCount > 0) {
    parts.push('Зоны роста: вопросы с partial/incorrect требуют разбора по ответам.');
  } else {
    parts.push('Все вопросы закрыты без явных зон роста.');
  }

  if (comments.length > 0) {
    parts.push(`Комментарии: ${comments.join('; ')}.`);
  }

  return truncateFeedback(parts.join(' '));
}

function formatCriterionTitle(criterion: InterviewFeedbackCriterionInput) {
  const title = criterion.title.trim();
  const competencyName = criterion.competencyName?.trim();

  return competencyName ? `${title} (${competencyName})` : title;
}

function truncateFeedback(value: string) {
  if (value.length <= FEEDBACK_LENGTH_LIMIT) {
    return value;
  }

  return `${value.slice(0, FEEDBACK_LENGTH_LIMIT - 1).trimEnd()}…`;
}
