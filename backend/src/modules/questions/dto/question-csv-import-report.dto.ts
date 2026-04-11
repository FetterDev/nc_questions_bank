import { ApiProperty } from '@nestjs/swagger';
import {
  QUESTION_CODE_LANGUAGES,
  QuestionCodeLanguage,
} from '../question-structured-content';
import { QuestionDifficulty } from '../question-difficulty';

export const QUESTION_CSV_IMPORT_ROW_SUMMARIES = [
  'create',
  'update',
  'no_change',
  'error',
] as const;

export type QuestionCsvImportRowSummary =
  (typeof QUESTION_CSV_IMPORT_ROW_SUMMARIES)[number];

class QuestionCsvImportTotalsDto {
  @ApiProperty({ example: 500 })
  totalRows!: number;

  @ApiProperty({ example: 120 })
  create!: number;

  @ApiProperty({ example: 48 })
  update!: number;

  @ApiProperty({ example: 310 })
  noChange!: number;

  @ApiProperty({ example: 22 })
  error!: number;

  @ApiProperty({ example: 17 })
  warning!: number;
}

class QuestionCsvImportNormalizedRowDto {
  @ApiProperty({ type: String, nullable: true, example: 'cm8abc123' })
  id!: string | null;

  @ApiProperty({ type: [String], example: ['HTML', 'Browser APIs'] })
  topics!: string[];

  @ApiProperty({ example: 'Что такое Event Loop?' })
  questionText!: string;

  @ApiProperty({ type: String, nullable: true, example: 'console.log(1)' })
  questionCode!: string | null;

  @ApiProperty({
    enum: QUESTION_CODE_LANGUAGES,
    nullable: true,
    example: 'javascript',
  })
  questionCodeLanguage!: QuestionCodeLanguage | null;

  @ApiProperty({ example: 'Механизм координации задач в JavaScript runtime.' })
  answerText!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Promise.resolve()' })
  answerCode!: string | null;

  @ApiProperty({
    enum: QUESTION_CODE_LANGUAGES,
    nullable: true,
    example: 'javascript',
  })
  answerCodeLanguage!: QuestionCodeLanguage | null;

  @ApiProperty({
    enum: QuestionDifficulty,
    nullable: true,
    example: QuestionDifficulty.MIDDLE,
  })
  difficulty!: QuestionDifficulty | null;

  @ApiProperty({ type: String, nullable: true, example: 'Google' })
  company!: string | null;
}

class QuestionCsvImportRowDto {
  @ApiProperty({ example: 2 })
  rowNumber!: number;

  @ApiProperty({
    enum: QUESTION_CSV_IMPORT_ROW_SUMMARIES,
    example: 'update',
  })
  summary!: QuestionCsvImportRowSummary;

  @ApiProperty({ type: [String] })
  errors!: string[];

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({ type: QuestionCsvImportNormalizedRowDto })
  normalized!: QuestionCsvImportNormalizedRowDto;
}

export class QuestionCsvImportReportDto {
  @ApiProperty({ example: false })
  applied!: boolean;

  @ApiProperty({ example: '_Вопросы - Основной.csv' })
  fileName!: string;

  @ApiProperty({ enum: [';', ','], example: ';' })
  delimiter!: ';' | ',';

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({ type: [String], example: ['Angular', 'Browser APIs'] })
  topicsToCreate!: string[];

  @ApiProperty({ type: [String], example: ['Google', 'Yandex'] })
  companiesToCreate!: string[];

  @ApiProperty({ type: QuestionCsvImportTotalsDto })
  totals!: QuestionCsvImportTotalsDto;

  @ApiProperty({ type: [QuestionCsvImportRowDto] })
  rows!: QuestionCsvImportRowDto[];
}
