import { Module } from '@nestjs/common';
import { QuestionInterviewEncountersRepository } from './question-interview-encounters.repository';
import { QuestionSelectionRepository } from './question-selection.repository';
import { QuestionsRepository } from './questions.repository';

@Module({
  providers: [
    QuestionsRepository,
    QuestionInterviewEncountersRepository,
    QuestionSelectionRepository,
  ],
  exports: [
    QuestionsRepository,
    QuestionInterviewEncountersRepository,
    QuestionSelectionRepository,
  ],
})
export class QuestionsAccessModule {}
