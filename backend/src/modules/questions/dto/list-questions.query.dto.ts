import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '../question-difficulty';

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function toDifficultyOrUndefined(
  value: unknown,
): QuestionDifficulty | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value).trim().toLowerCase() as QuestionDifficulty;
}

export class ListQuestionsQueryDto {
  @ApiPropertyOptional({
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MIDDLE,
  })
  @IsOptional()
  @Transform(({ value }) => toDifficultyOrUndefined(value))
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ description: 'Имя темы (name или slug)', example: 'js' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
