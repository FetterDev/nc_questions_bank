import { Module } from '@nestjs/common';
import { QuestionChangeRequestsRepository } from './question-change-requests.repository';

@Module({
  providers: [QuestionChangeRequestsRepository],
  exports: [QuestionChangeRequestsRepository],
})
export class QuestionChangeRequestsAccessModule {}
