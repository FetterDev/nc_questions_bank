import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { TrainingResult } from '../../training/training-result';
import { InterviewItemDto, InterviewUserDto } from './interview-common.dto';

class InterviewHistoryCriterionResultDto {
  @ApiProperty({ example: 'cm8criterion1' })
  id!: string;

  @ApiProperty({ example: 'Называет tradeoff выбранного подхода' })
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ example: 2 })
  weight!: number;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ nullable: true, enum: TrainingResult })
  result!: TrainingResult | null;

  @ApiProperty({ type: String, nullable: true })
  comment!: string | null;

  @ApiProperty({
    nullable: true,
    example: {
      id: 'cm8competency1',
      name: 'TypeScript',
      slug: 'typescript',
    },
  })
  competency!: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

class InterviewHistoryQuestionDto {
  @ApiProperty({ example: 'cm8interviewQuestion1' })
  id!: string;

  @ApiProperty({ example: 'seed-question-bank-123456789abc' })
  questionId!: string;

  @ApiProperty({ example: 'Когда нужен составной индекс?' })
  questionText!: string;

  @ApiProperty({ type: [QuestionStructuredContentDto] })
  questionTextContent!: QuestionStructuredContentDto[];

  @ApiProperty({ example: 'Нужно, когда фильтруешь и сортируешь по нескольким полям.' })
  answer!: string;

  @ApiProperty({ type: [QuestionStructuredContentDto] })
  answerContent!: QuestionStructuredContentDto[];

  @ApiProperty({ enum: QuestionDifficulty })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ nullable: true, enum: TrainingResult })
  result!: TrainingResult | null;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];

  @ApiProperty({ type: [InterviewHistoryCriterionResultDto] })
  criteria!: InterviewHistoryCriterionResultDto[];
}

class InterviewCompetencySummaryDto {
  @ApiProperty({ example: 'cm8competency1' })
  competencyId!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiProperty({ example: 'typescript' })
  slug!: string;

  @ApiProperty({ example: 4 })
  correctCount!: number;

  @ApiProperty({ example: 2 })
  partialCount!: number;

  @ApiProperty({ example: 1 })
  incorrectCount!: number;

  @ApiProperty({ example: 57 })
  accuracy!: number;
}

export class ListInterviewHistoryResponseDto {
  @ApiProperty({ type: [InterviewItemDto] })
  items!: InterviewItemDto[];
}

export class InterviewHistoryDetailResponseDto {
  @ApiProperty({ type: InterviewItemDto })
  interview!: InterviewItemDto;

  @ApiProperty({ type: InterviewUserDto })
  interviewer!: InterviewUserDto;

  @ApiProperty({ type: InterviewUserDto })
  interviewee!: InterviewUserDto;

  @ApiProperty({ type: String, nullable: true })
  feedback!: string | null;

  @ApiProperty({ type: [InterviewHistoryQuestionDto] })
  questions!: InterviewHistoryQuestionDto[];

  @ApiProperty({ type: [InterviewCompetencySummaryDto] })
  competencySummary!: InterviewCompetencySummaryDto[];
}
