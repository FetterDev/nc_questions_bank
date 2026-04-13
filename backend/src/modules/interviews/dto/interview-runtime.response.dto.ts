import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { InterviewItemDto, InterviewUserDto } from './interview-common.dto';

class InterviewRuntimeQuestionDto {
  @ApiProperty({ example: 'cm8interviewquestion1' })
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

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];
}

export class InterviewRuntimeResponseDto {
  @ApiProperty({ type: InterviewItemDto })
  interview!: InterviewItemDto;

  @ApiProperty({ type: InterviewUserDto })
  counterpart!: InterviewUserDto;

  @ApiProperty({ type: [InterviewRuntimeQuestionDto] })
  items!: InterviewRuntimeQuestionDto[];
}
