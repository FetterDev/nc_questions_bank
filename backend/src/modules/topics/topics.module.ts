import { Module } from '@nestjs/common';
import { QuestionChangeRequestsAccessModule } from '../question-change-requests/question-change-requests-access.module';
import { TopicsAccessModule } from './topics-access.module';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [TopicsAccessModule, QuestionChangeRequestsAccessModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService, TopicsAccessModule],
})
export class TopicsModule {}
