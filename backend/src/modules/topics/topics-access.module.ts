import { Module } from '@nestjs/common';
import { TopicsRepository } from './topics.repository';

@Module({
  providers: [TopicsRepository],
  exports: [TopicsRepository],
})
export class TopicsAccessModule {}
