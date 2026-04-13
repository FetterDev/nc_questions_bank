import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { TrainingResult } from '../training-result';
import { TrainingHistorySessionDto } from './training-history-session.dto';

class TrainingHistoryResultItemDto {
  @ApiProperty({ example: 'seed-question-bank-123456789abc' })
  questionId!: string;

  @ApiProperty({ example: 'Когда нужен составной индекс?' })
  text!: string;

  @ApiProperty({ type: [QuestionStructuredContentDto] })
  textContent!: QuestionStructuredContentDto[];

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ enum: TrainingResult, example: TrainingResult.PARTIAL })
  result!: TrainingResult;

  @ApiProperty({ example: 3 })
  position!: number;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];
}

export class TrainingHistoryDetailResponseDto extends TrainingHistorySessionDto {
  @ApiProperty({ type: [TrainingHistoryResultItemDto] })
  results!: TrainingHistoryResultItemDto[];
}
