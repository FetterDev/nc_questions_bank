import { ApiProperty } from '@nestjs/swagger';
import { TrainingSessionStatus } from '@prisma/client';

export class TrainingHistoryTrainerDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'nord.user' })
  login!: string;

  @ApiProperty({ example: 'Nord User' })
  displayName!: string;
}

export class TrainingHistorySessionDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1session' })
  id!: string;

  @ApiProperty({
    enum: TrainingSessionStatus,
    example: TrainingSessionStatus.COMPLETED,
  })
  status!: TrainingSessionStatus;

  @ApiProperty({ example: 12 })
  resultsCount!: number;

  @ApiProperty({ example: 5 })
  correctCount!: number;

  @ApiProperty({ example: 4 })
  incorrectCount!: number;

  @ApiProperty({ example: 3 })
  partialCount!: number;

  @ApiProperty({
    nullable: true,
    example: 'Нужно точнее формулировать компромиссы и аргументацию.',
  })
  feedback!: string | null;

  @ApiProperty({
    type: TrainingHistoryTrainerDto,
    nullable: true,
  })
  trainer!: TrainingHistoryTrainerDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  finishedAt!: string;
}
