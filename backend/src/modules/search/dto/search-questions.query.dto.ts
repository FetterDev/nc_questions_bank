import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '../../questions/question-difficulty';

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function toDifficultyArray(value: unknown): QuestionDifficulty[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : String(value).split(',');
  const parsed = raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) as QuestionDifficulty[];

  return parsed.length > 0 ? parsed : undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : String(value).split(',');
  const parsed = raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : undefined;
}

export enum SearchSort {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class SearchQuestionsQueryDto {
  @ApiPropertyOptional({ description: 'Поисковый запрос', example: 'scope' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по сложности (CSV или repeatable query)',
    enum: QuestionDifficulty,
    isArray: true,
    example: [QuestionDifficulty.JUNIOR, QuestionDifficulty.MIDDLE],
  })
  @IsOptional()
  @Transform(({ value }) => toDifficultyArray(value))
  @IsEnum(QuestionDifficulty, { each: true })
  difficulty?: QuestionDifficulty[];

  @ApiPropertyOptional({
    description: 'Фильтр по topicId (CSV или repeatable query)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsString({ each: true })
  topicIds?: string[];

  @ApiPropertyOptional({
    description: 'Строковый поиск по названию компании',
    example: 'google',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyQuery?: string;

  @ApiPropertyOptional({ enum: SearchSort, default: SearchSort.RELEVANCE })
  @IsOptional()
  @IsEnum(SearchSort)
  sort?: SearchSort;

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
