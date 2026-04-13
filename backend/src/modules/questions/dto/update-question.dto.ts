import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStructuredContentDto } from './question-structured-content.dto';
import { QuestionDifficulty } from '../question-difficulty';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    description: 'Структурированное содержимое вопроса',
    type: [QuestionStructuredContentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionStructuredContentDto)
  textContent?: QuestionStructuredContentDto[];

  @ApiPropertyOptional({
    description: 'Структурированное содержимое ответа',
    type: [QuestionStructuredContentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionStructuredContentDto)
  answerContent?: QuestionStructuredContentDto[];

  @ApiPropertyOptional({
    description: 'Сложность вопроса',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MIDDLE,
  })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({
    description: 'Список topicId',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  topicIds?: string[];

  @ApiPropertyOptional({
    description: 'Новый companyId или null для отвязки компании',
    type: String,
    nullable: true,
    example: 'cm7y5z8qv0003x4f2w7sn1company',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  companyId?: string | null;
}
