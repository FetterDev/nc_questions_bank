import { TrainingSessionStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { TrainingResult } from '../training-result';

class SaveTrainingResultsItemDto {
  @ApiProperty({ example: 'seed-question-bank-123456789abc' })
  @IsString()
  questionId!: string;

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @ApiProperty({ type: [String], example: ['seed-topic-javascript', 'seed-topic-typescript'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  topicIds!: string[];

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.CORRECT })
  @IsEnum(TrainingResult)
  result!: TrainingResult;
}

export class SaveTrainingResultsDto {
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'cm8q4x7r10001s2t3u4v5w6x7',
  })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Нужно подтянуть аргументацию по Angular change detection и RxJS error handling.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;

  @ApiProperty({
    enum: TrainingSessionStatus,
    example: TrainingSessionStatus.COMPLETED,
  })
  @IsEnum(TrainingSessionStatus)
  status!: TrainingSessionStatus;

  @ApiProperty({ type: [SaveTrainingResultsItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items!: SaveTrainingResultsItemDto[];
}
