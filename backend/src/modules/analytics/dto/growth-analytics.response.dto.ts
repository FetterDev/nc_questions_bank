import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { TrainingResult } from '../../training/training-result';

class GrowthAnalyticsSummaryDto {
  @ApiProperty({ example: 42 })
  totalResults!: number;

  @ApiProperty({ example: 25 })
  correctCount!: number;

  @ApiProperty({ example: 17 })
  incorrectCount!: number;

  @ApiProperty({ example: 6 })
  partialCount!: number;

  @ApiProperty({ example: 60 })
  accuracy!: number;
}

class GrowthAnalyticsTopicStatDto {
  @ApiProperty({ example: 'seed-topic-angular' })
  topicId!: string;

  @ApiProperty({ example: 'Angular' })
  name!: string;

  @ApiProperty({ example: 'angular' })
  slug!: string;

  @ApiProperty({ example: 9 })
  correctCount!: number;

  @ApiProperty({ example: 14 })
  incorrectCount!: number;

  @ApiProperty({ example: 5 })
  partialCount!: number;

  @ApiProperty({ example: 39 })
  accuracy!: number;
}

class GrowthAnalyticsQuestionStatDto {
  @ApiProperty({ example: 'seed-question-bank-123456789abc' })
  questionId!: string;

  @ApiProperty({ example: 'Когда нужен составной индекс?' })
  text!: string;

  @ApiProperty({ type: QuestionStructuredContentDto })
  textContent!: QuestionStructuredContentDto;

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];

  @ApiProperty({ example: 3 })
  correctCount!: number;

  @ApiProperty({ example: 5 })
  incorrectCount!: number;

  @ApiProperty({ example: 2 })
  partialCount!: number;

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.PARTIAL })
  lastResult!: TrainingResult;

  @ApiProperty({ type: String, format: 'date-time' })
  lastAnsweredAt!: string;
}

class GrowthAnalyticsFeedbackTrainerDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'Nord Admin' })
  displayName!: string;

  @ApiProperty({ example: 'nord.admin' })
  login!: string;
}

class GrowthAnalyticsFeedbackItemDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1session' })
  sessionId!: string;

  @ApiProperty({
    type: GrowthAnalyticsFeedbackTrainerDto,
    nullable: true,
  })
  trainer!: GrowthAnalyticsFeedbackTrainerDto | null;

  @ApiProperty({
    example: 'Нужно подтянуть аргументацию по Angular change detection и RxJS error handling.',
  })
  feedback!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  finishedAt!: string;
}

export class GrowthAnalyticsResponseDto {
  @ApiProperty({ type: GrowthAnalyticsSummaryDto })
  summary!: GrowthAnalyticsSummaryDto;

  @ApiProperty({ type: [GrowthAnalyticsFeedbackItemDto] })
  feedbackEntries!: GrowthAnalyticsFeedbackItemDto[];

  @ApiProperty({ type: [GrowthAnalyticsTopicStatDto] })
  weakTopics!: GrowthAnalyticsTopicStatDto[];

  @ApiProperty({ type: [GrowthAnalyticsQuestionStatDto] })
  failedQuestions!: GrowthAnalyticsQuestionStatDto[];

  @ApiProperty({ type: [GrowthAnalyticsQuestionStatDto] })
  answeredQuestions!: GrowthAnalyticsQuestionStatDto[];
}
