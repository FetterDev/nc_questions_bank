import { Module } from '@nestjs/common';
import { QuestionChangeRequestsAccessModule } from '../question-change-requests/question-change-requests-access.module';
import { QuestionsAccessModule } from '../questions/questions-access.module';
import { SearchController } from './search.controller';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';

@Module({
  imports: [QuestionChangeRequestsAccessModule, QuestionsAccessModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchService, SearchRepository],
})
export class SearchModule {}
