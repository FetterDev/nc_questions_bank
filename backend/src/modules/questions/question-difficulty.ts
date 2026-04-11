export enum QuestionDifficulty {
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
}

export type QuestionDifficultyRank = 1 | 2 | 3 | 4;

const DIFFICULTY_TO_RANK: Record<QuestionDifficulty, QuestionDifficultyRank> = {
  [QuestionDifficulty.JUNIOR]: 1,
  [QuestionDifficulty.MIDDLE]: 2,
  [QuestionDifficulty.SENIOR]: 3,
  [QuestionDifficulty.LEAD]: 4,
};

export function toDifficultyRank(
  difficulty: QuestionDifficulty,
): QuestionDifficultyRank {
  return DIFFICULTY_TO_RANK[difficulty];
}

export function fromDifficultyRank(value: number): QuestionDifficulty {
  if (value === 1) {
    return QuestionDifficulty.JUNIOR;
  }

  if (value === 2) {
    return QuestionDifficulty.MIDDLE;
  }

  if (value === 3) {
    return QuestionDifficulty.SENIOR;
  }

  if (value === 4) {
    return QuestionDifficulty.LEAD;
  }

  throw new Error(`Unknown question difficulty rank: ${value}`);
}
