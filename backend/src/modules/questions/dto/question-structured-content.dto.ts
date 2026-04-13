import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  QUESTION_CODE_LANGUAGES,
  QuestionCodeLanguage,
} from '../question-structured-content';

export class QuestionStructuredContentDto {
  @ApiProperty({
    enum: ['text', 'code'],
    example: 'text',
  })
  @IsIn(['text', 'code'])
  kind!: 'text' | 'code';

  @ApiProperty({
    example: 'Что выведет этот код?',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({
    enum: QUESTION_CODE_LANGUAGES,
    example: 'typescript',
  })
  @IsOptional()
  @IsIn(QUESTION_CODE_LANGUAGES)
  language?: QuestionCodeLanguage;
}
