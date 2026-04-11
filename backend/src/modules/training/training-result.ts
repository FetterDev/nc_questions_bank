import { TrainingSessionResultMark } from '@prisma/client';

export enum TrainingResult {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  PARTIAL = 'partial',
}

const TRAINING_RESULT_TO_DB: Record<TrainingResult, TrainingSessionResultMark> = {
  [TrainingResult.CORRECT]: TrainingSessionResultMark.CORRECT,
  [TrainingResult.INCORRECT]: TrainingSessionResultMark.INCORRECT,
  [TrainingResult.PARTIAL]: TrainingSessionResultMark.PARTIAL,
};

const TRAINING_RESULT_FROM_DB: Record<TrainingSessionResultMark, TrainingResult> = {
  [TrainingSessionResultMark.CORRECT]: TrainingResult.CORRECT,
  [TrainingSessionResultMark.INCORRECT]: TrainingResult.INCORRECT,
  [TrainingSessionResultMark.PARTIAL]: TrainingResult.PARTIAL,
};

export function toTrainingResultDb(result: TrainingResult) {
  return TRAINING_RESULT_TO_DB[result];
}

export function fromTrainingResultDb(result: TrainingSessionResultMark) {
  return TRAINING_RESULT_FROM_DB[result];
}

export function isCorrectTrainingResult(result: TrainingResult) {
  return result === TrainingResult.CORRECT;
}

export function isIncorrectTrainingResult(result: TrainingResult) {
  return result === TrainingResult.INCORRECT;
}

export function isPartialTrainingResult(result: TrainingResult) {
  return result === TrainingResult.PARTIAL;
}
