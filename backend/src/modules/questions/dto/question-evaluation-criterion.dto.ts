import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionCompetencyDto } from './question-competency.dto';

export class QuestionEvaluationCriterionDto {
  @ApiProperty({ example: 'cm8q4x7r10001criterion' })
  id!: string;

  @ApiProperty({ example: 'Называет tradeoff выбранного подхода' })
  title!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Кандидат должен объяснить плюсы и минусы решения.',
  })
  description!: string | null;

  @ApiProperty({ example: 2 })
  weight!: number;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ type: QuestionCompetencyDto, nullable: true })
  competency!: QuestionCompetencyDto | null;
}

