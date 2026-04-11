import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';

class TrainingQuestionItemDto {
  @ApiProperty({ example: 'seed-question-bank-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'Что такое dependency injection в Angular?' })
  text!: string;

  @ApiProperty({ type: QuestionStructuredContentDto })
  textContent!: QuestionStructuredContentDto;

  @ApiProperty({
    example:
      'Это механизм передачи зависимостей извне, чтобы класс не создавал их самостоятельно.',
  })
  answer!: string;

  @ApiProperty({ type: QuestionStructuredContentDto })
  answerContent!: QuestionStructuredContentDto;

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.JUNIOR })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];

  @ApiProperty({ type: QuestionTopicDto })
  assignedTopic!: QuestionTopicDto;
}

class TrainingTopicBreakdownDto {
  @ApiProperty({ type: QuestionTopicDto })
  topic!: QuestionTopicDto;

  @ApiProperty({ example: 7 })
  availableCount!: number;

  @ApiProperty({ example: 5 })
  selectedCount!: number;
}

class PrepareTrainingMetaDto {
  @ApiProperty({ example: 11 })
  tookMs!: number;

  @ApiProperty({ example: 5 })
  requestedPerTopic!: number;

  @ApiProperty({ type: [TrainingTopicBreakdownDto] })
  topicBreakdown!: TrainingTopicBreakdownDto[];
}

export class PrepareTrainingResponseDto {
  @ApiProperty({ type: [TrainingQuestionItemDto] })
  items!: TrainingQuestionItemDto[];

  @ApiProperty({ example: 19 })
  total!: number;

  @ApiProperty({ type: PrepareTrainingMetaDto })
  meta!: PrepareTrainingMetaDto;
}
