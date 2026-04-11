import { ApiProperty } from '@nestjs/swagger';
import { QuestionInterviewEncounterDto } from './question-interview-encounter.dto';
import { QuestionCompanyDto } from './question-company.dto';
import { QuestionStructuredContentDto } from './question-structured-content.dto';
import { QuestionTopicDto } from './question-topic.dto';
import { QuestionPendingChangeRequestDto } from './question-pending-change-request.dto';
import { QuestionDifficulty } from '../question-difficulty';

export class QuestionDto {
  @ApiProperty({ example: 'cm7y5z8qv0001x4f2w7sn1aaa' })
  id!: string;

  @ApiProperty({ example: 'Какие основные типы данных есть в JavaScript?' })
  text!: string;

  @ApiProperty({ type: QuestionStructuredContentDto })
  textContent!: QuestionStructuredContentDto;

  @ApiProperty({ example: 'string, number, boolean, null, undefined, symbol, bigint, object.' })
  answer!: string;

  @ApiProperty({ type: QuestionStructuredContentDto })
  answerContent!: QuestionStructuredContentDto;

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.JUNIOR })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ type: QuestionCompanyDto, nullable: true })
  company!: QuestionCompanyDto | null;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: QuestionPendingChangeRequestDto })
  pendingChangeRequest!: QuestionPendingChangeRequestDto;

  @ApiProperty({ type: QuestionInterviewEncounterDto })
  interviewEncounter!: QuestionInterviewEncounterDto;
}
