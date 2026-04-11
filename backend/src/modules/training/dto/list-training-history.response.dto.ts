import { ApiProperty } from '@nestjs/swagger';
import { TrainingHistorySessionDto } from './training-history-session.dto';

export class ListTrainingHistoryResponseDto {
  @ApiProperty({ type: [TrainingHistorySessionDto] })
  items!: TrainingHistorySessionDto[];
}
