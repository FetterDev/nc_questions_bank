import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStructuredContentDto } from './question-structured-content.dto';
import { QuestionDifficulty } from '../question-difficulty';

export class QuestionEvaluationCriterionInputDto {
  @ApiProperty({ example: 'Называет tradeoff выбранного подхода' })
  @IsString()
  @Length(1, 160)
  title!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Кандидат должен объяснить плюсы и минусы решения.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'cm8q4x7r10001competency',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  competencyId?: string | null;

  @ApiProperty({ minimum: 1, maximum: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  weight?: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Структурированное содержимое вопроса',
    type: [QuestionStructuredContentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionStructuredContentDto)
  textContent!: QuestionStructuredContentDto[];

  @ApiProperty({
    description: 'Структурированное содержимое ответа',
    type: [QuestionStructuredContentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionStructuredContentDto)
  answerContent!: QuestionStructuredContentDto[];

  @ApiProperty({
    description: 'Сложность вопроса',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.JUNIOR,
  })
  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @ApiProperty({
    description: 'Список topicId',
    type: [String],
    minItems: 1,
    example: ['cm7y5z8qv0003x4f2w7sn1abc'],
  })
  @IsArray()
  @ArrayMinSize(1)
  topicIds!: string[];

  @ApiProperty({
    description: 'Опциональный companyId, если вопрос встречался на собеседовании в компании',
    type: String,
    required: false,
    nullable: true,
    example: 'cm7y5z8qv0003x4f2w7sn1company',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  companyId?: string | null;

  @ApiProperty({
    description: 'Список competencyId',
    type: [String],
    required: false,
    example: ['cm8q4x7r10001competency'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  competencyIds?: string[];

  @ApiProperty({
    description: 'Критерии оценки вопроса',
    type: [QuestionEvaluationCriterionInputDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionEvaluationCriterionInputDto)
  evaluationCriteria?: QuestionEvaluationCriterionInputDto[];
}
