import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStructuredContentDto } from './question-structured-content.dto';
import { QuestionDifficulty } from '../question-difficulty';

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
}
