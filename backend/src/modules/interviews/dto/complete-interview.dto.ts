import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrainingResult } from '../../training/training-result';

class CompleteInterviewItemDto {
  @ApiProperty({ example: 'cm8interviewquestion1' })
  @IsString()
  interviewQuestionId!: string;

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.PARTIAL })
  @IsEnum(TrainingResult)
  result!: TrainingResult;
}

export class CompleteInterviewDto {
  @ApiPropertyOptional({
    example: 'Нужно точнее формулировать компромиссы и быстрее структурировать ответ.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;

  @ApiProperty({ type: [CompleteInterviewItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items!: CompleteInterviewItemDto[];
}
