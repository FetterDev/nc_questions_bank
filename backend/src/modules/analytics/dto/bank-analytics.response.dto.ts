import { ApiProperty } from '@nestjs/swagger';
import { QuestionDifficulty } from '../../questions/question-difficulty';

class BankAnalyticsDifficultyMixItemDto {
  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ example: 24 })
  count!: number;

  @ApiProperty({ example: 38 })
  share!: number;
}

class BankAnalyticsTopicStatDto {
  @ApiProperty({ example: 'seed-topic-angular' })
  topicId!: string;

  @ApiProperty({ example: 'Angular' })
  name!: string;

  @ApiProperty({ example: 'angular' })
  slug!: string;

  @ApiProperty({ example: 12 })
  count!: number;
}

export class BankAnalyticsResponseDto {
  @ApiProperty({ example: 64 })
  totalQuestions!: number;

  @ApiProperty({
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MIDDLE,
    nullable: true,
  })
  dominantDifficulty!: QuestionDifficulty | null;

  @ApiProperty({ type: [BankAnalyticsDifficultyMixItemDto] })
  difficultyMix!: BankAnalyticsDifficultyMixItemDto[];

  @ApiProperty({ type: [BankAnalyticsTopicStatDto] })
  topTopics!: BankAnalyticsTopicStatDto[];

  @ApiProperty({ type: [BankAnalyticsTopicStatDto] })
  sparseTopics!: BankAnalyticsTopicStatDto[];
}
