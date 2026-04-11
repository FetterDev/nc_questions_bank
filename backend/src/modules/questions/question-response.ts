import { PendingQuestionState } from '../question-change-requests/question-change-requests.repository';
import { QuestionInterviewEncounterState } from './question-interview-encounters.repository';
import { fromDifficultyRank } from './question-difficulty';
import { QuestionOutput } from './questions.repository';

export function toQuestionResponse(
  question: QuestionOutput,
  pendingState: PendingQuestionState,
  interviewEncounter: QuestionInterviewEncounterState,
) {
  return {
    ...question,
    difficulty: fromDifficultyRank(question.difficulty),
    pendingChangeRequest: pendingState,
    interviewEncounter,
  };
}
