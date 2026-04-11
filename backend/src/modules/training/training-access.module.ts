import { Module } from '@nestjs/common';
import { TrainingPresetsRepository } from './training-presets.repository';
import { TrainingRepository } from './training.repository';

@Module({
  providers: [TrainingPresetsRepository, TrainingRepository],
  exports: [TrainingPresetsRepository, TrainingRepository],
})
export class TrainingAccessModule {}
