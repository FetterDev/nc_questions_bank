import { TrainingSessionStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SaveTrainingResultsResponseDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1session' })
  id!: string;

  @ApiProperty({
    enum: TrainingSessionStatus,
    example: TrainingSessionStatus.COMPLETED,
  })
  status!: TrainingSessionStatus;

  @ApiProperty({ example: 12 })
  resultsCount!: number;

  @ApiProperty({ example: 7 })
  correctCount!: number;

  @ApiProperty({ example: 5 })
  incorrectCount!: number;

  @ApiProperty({ example: 2 })
  partialCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  finishedAt!: string;
}
