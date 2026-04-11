import { Module } from '@nestjs/common';
import { QuestionsAccessModule } from '../questions/questions-access.module';
import { TrainingAccessModule } from '../training/training-access.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsRepository } from './interviews.repository';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [QuestionsAccessModule, TrainingAccessModule],
  controllers: [InterviewsController],
  providers: [InterviewsRepository, InterviewsService],
})
export class InterviewsModule {}
