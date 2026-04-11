import { Module } from '@nestjs/common';
import { CompaniesAccessModule } from '../companies/companies-access.module';
import { QuestionsAccessModule } from '../questions/questions-access.module';
import { TopicsAccessModule } from '../topics/topics-access.module';
import { QuestionChangeRequestsAccessModule } from './question-change-requests-access.module';
import { QuestionChangeRequestsController } from './question-change-requests.controller';
import { QuestionChangeRequestsService } from './question-change-requests.service';

@Module({
  imports: [
    QuestionsAccessModule,
    QuestionChangeRequestsAccessModule,
    CompaniesAccessModule,
    TopicsAccessModule,
  ],
  controllers: [QuestionChangeRequestsController],
  providers: [QuestionChangeRequestsService],
  exports: [QuestionChangeRequestsService],
})
export class QuestionChangeRequestsModule {}
