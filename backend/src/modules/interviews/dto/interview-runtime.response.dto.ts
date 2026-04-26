import { ApiProperty } from '@nestjs/swagger';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { InterviewItemDto, InterviewUserDto } from './interview-common.dto';

class InterviewRuntimeCriterionDto {
  @ApiProperty({ example: 'cm8interviewcriterion1' })
  id!: string;

  @ApiProperty({ example: 'cm8criterionSource1', nullable: true })
  sourceCriterionId!: string | null;

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

  @ApiProperty({ example: 'Называет tradeoff выбранного подхода' })
  title!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Кандидат должен объяснить плюсы и минусы решения.',
  })
  description!: string | null;

  @ApiProperty({ example: 2 })
  weight!: number;

  @ApiProperty({ example: 0 })
  position!: number;
}

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

  @ApiProperty({ type: [InterviewRuntimeCriterionDto] })
  criteria!: InterviewRuntimeCriterionDto[];
}

export class InterviewRuntimeResponseDto {
  @ApiProperty({ type: InterviewItemDto })
  interview!: InterviewItemDto;

  @ApiProperty({ type: InterviewUserDto })
  counterpart!: InterviewUserDto;

  @ApiProperty({ type: [InterviewRuntimeQuestionDto] })
  items!: InterviewRuntimeQuestionDto[];
}
