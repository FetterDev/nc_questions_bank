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
    return 'correct';
  }

  if (value === 'partial') {
    return 'partial';
  }

  return 'incorrect';
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
