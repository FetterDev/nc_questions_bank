import { Module } from '@nestjs/common';
import { CompaniesAccessModule } from '../companies/companies-access.module';
import { QuestionChangeRequestsAccessModule } from '../question-change-requests/question-change-requests-access.module';
import { SearchModule } from '../search/search.module';
import { TopicsAccessModule } from '../topics/topics-access.module';
import { QuestionsAccessModule } from './questions-access.module';
import { QuestionsController } from './questions.controller';
import { QuestionsCsvService } from './questions-csv.service';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    QuestionsAccessModule,
    QuestionChangeRequestsAccessModule,
    CompaniesAccessModule,
    TopicsAccessModule,
    SearchModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionsCsvService],
  exports: [QuestionsService, QuestionsAccessModule],
})
export class QuestionsModule {}
