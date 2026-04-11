import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { QuestionChangeRequestType } from '@prisma/client';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';

class QuestionChangeRequestPayloadDto {
  @ApiProperty({
    description: 'Структурированное содержимое вопроса',
    type: QuestionStructuredContentDto,
  })
  @ValidateNested()
  @Type(() => QuestionStructuredContentDto)
  textContent!: QuestionStructuredContentDto;

  @ApiProperty({
    description: 'Структурированное содержимое ответа',
    type: QuestionStructuredContentDto,
  })
  @ValidateNested()
  @Type(() => QuestionStructuredContentDto)
  answerContent!: QuestionStructuredContentDto;

  @ApiProperty({
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MIDDLE,
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
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  topicIds!: string[];

  @ApiPropertyOptional({
    description: 'Опциональный companyId',
    type: String,
    nullable: true,
    example: 'cm7y5z8qv0003x4f2w7sn1company',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  companyId?: string | null;
}

export class CreateQuestionChangeRequestDto {
  @ApiProperty({
    enum: QuestionChangeRequestType,
    example: QuestionChangeRequestType.UPDATE,
  })
  @IsEnum(QuestionChangeRequestType)
  type!: QuestionChangeRequestType;

  @ApiPropertyOptional({
    description: 'ID опубликованного вопроса для UPDATE или DELETE',
    example: 'cm7y5z8qv0001x4f2w7sn1aaa',
  })
  @IsOptional()
  @IsString()
  targetQuestionId?: string;

  @ApiPropertyOptional({ type: QuestionChangeRequestPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionChangeRequestPayloadDto)
  payload?: QuestionChangeRequestPayloadDto;
}

export { QuestionChangeRequestPayloadDto };
