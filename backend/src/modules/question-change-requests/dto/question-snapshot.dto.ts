import { ApiProperty } from '@nestjs/swagger';
import { QuestionCompanyDto } from '../../questions/dto/question-company.dto';
import { QuestionCompetencyDto } from '../../questions/dto/question-competency.dto';
import { QuestionEvaluationCriterionDto } from '../../questions/dto/question-evaluation-criterion.dto';
import { QuestionStructuredContentDto } from '../../questions/dto/question-structured-content.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';

export class QuestionSnapshotTopicDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1abc' })
  id!: string;

  @ApiProperty({ example: 'postgresql' })
  slug!: string;

  @ApiProperty({ example: 'PostgreSQL' })
  name!: string;
}

export class QuestionSnapshotDto {
  @ApiProperty({ example: 'Что такое MVCC?' })
  text!: string;

  @ApiProperty({ type: [QuestionStructuredContentDto] })
  textContent!: QuestionStructuredContentDto[];

  @ApiProperty({ example: 'Механизм версионирования строк в PostgreSQL.' })
  answer!: string;

  @ApiProperty({ type: [QuestionStructuredContentDto] })
  answerContent!: QuestionStructuredContentDto[];

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MIDDLE })
  difficulty!: QuestionDifficulty;

  @ApiProperty({ type: QuestionCompanyDto, nullable: true })
  company!: QuestionCompanyDto | null;

  @ApiProperty({ type: [QuestionSnapshotTopicDto] })
  topics!: QuestionSnapshotTopicDto[];

  @ApiProperty({ type: [QuestionCompetencyDto] })
  competencies!: QuestionCompetencyDto[];

  @ApiProperty({ type: [QuestionEvaluationCriterionDto] })
  evaluationCriteria!: QuestionEvaluationCriterionDto[];
}
