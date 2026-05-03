import type { TrainingCardState, TrainingResultValue } from './training.types';

export function isTrainingResultValue(value: TrainingCardState): value is TrainingResultValue {
  return value === 'correct' || value === 'incorrect' || value === 'partial';
}

export function formatTrainingResult(value: TrainingResultValue) {
  if (value === 'correct') {
    return 'засчитан';
  }

  if (value === 'partial') {
    return 'частично';
  }

  return 'не засчитан';
}

export function formatTrainingResultCompact(value: TrainingResultValue) {
  if (value === 'correct') {
    return 'засчитано';
  }

  if (value === 'partial') {
    return 'частично';
  }

  return 'не засчитано';
}

export function formatTrainingResultCounts(counts: {
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
}, separator = ' / ') {
  return [
    `${counts.correctCount} засчитано`,
    `${counts.partialCount} частично`,
    `${counts.incorrectCount} не засчитано`,
  ].join(separator);
}

export function trainingResultColor(value: TrainingResultValue) {
  if (value === 'correct') {
    return 'success';
  }

  if (value === 'partial') {
    return 'warning';
  }

  return 'error';
}
