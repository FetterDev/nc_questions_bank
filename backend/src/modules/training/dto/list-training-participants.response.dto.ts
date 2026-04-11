import { ApiProperty } from '@nestjs/swagger';
import { TrainingParticipantDto } from './training-participant.dto';

export class ListTrainingParticipantsResponseDto {
  @ApiProperty({ type: [TrainingParticipantDto] })
  items!: TrainingParticipantDto[];
}
