import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TrainingResult } from '../../training/training-result';

class CompleteInterviewCriterionResultDto {
  @ApiProperty({ example: 'cm8interviewcriterion1' })
  @IsString()
  criterionId!: string;

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.PARTIAL })
  @IsEnum(TrainingResult)
  result!: TrainingResult;

  @ApiPropertyOptional({
    example: 'Компромисс назван, но без привязки к ограничениям задачи.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isGrowthPoint?: boolean;

  @ApiPropertyOptional({
    example: 'Закрепить формулирование tradeoff через ограничения задачи.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  growthArea?: string;
}

class CompleteInterviewItemDto {
  @ApiProperty({ example: 'cm8interviewquestion1' })
  @IsString()
  interviewQuestionId!: string;

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.PARTIAL })
  @IsEnum(TrainingResult)
  result!: TrainingResult;

  @ApiPropertyOptional({ type: [CompleteInterviewCriterionResultDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteInterviewCriterionResultDto)
  criteriaResults?: CompleteInterviewCriterionResultDto[];
}

export class CompleteInterviewDto {
  @ApiPropertyOptional({
    example: 'Нужно точнее формулировать компромиссы и быстрее структурировать ответ.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;

  @ApiPropertyOptional({
    example: 'Потренировать tradeoff-и, edge cases и объяснение выбранных ограничений.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  growthAreas?: string;

  @ApiProperty({ type: [CompleteInterviewItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items!: CompleteInterviewItemDto[];
}
