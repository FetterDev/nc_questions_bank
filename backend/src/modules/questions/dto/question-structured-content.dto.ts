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
    example: 'Что выведет этот код?',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({
    example: 'const answer: number = 42;',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  code?: string;

  @ApiPropertyOptional({
    enum: QUESTION_CODE_LANGUAGES,
    example: 'typescript',
  })
  @IsOptional()
  @IsIn(QUESTION_CODE_LANGUAGES)
  codeLanguage?: QuestionCodeLanguage;
}
