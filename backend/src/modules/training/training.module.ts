import { Module } from '@nestjs/common';
import { QuestionsAccessModule } from '../questions/questions-access.module';
import { TopicsAccessModule } from '../topics/topics-access.module';
import { UsersModule } from '../users/users.module';
import { TrainingAccessModule } from './training-access.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [
    TrainingAccessModule,
    TopicsAccessModule,
    QuestionsAccessModule,
    UsersModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService, TrainingAccessModule],
})
export class TrainingModule {}
