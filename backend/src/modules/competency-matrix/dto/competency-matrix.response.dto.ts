import { ApiProperty } from '@nestjs/swagger';
import { TrainingResult } from '../../training/training-result';

class CompetencyMatrixUserDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'ivan.petrov' })
  login!: string;

  @ApiProperty({ example: 'Иван Петров' })
  displayName!: string;
}

class CompetencyMatrixStackDto {
  @ApiProperty({ example: 'cm8stack1' })
  id!: string;

  @ApiProperty({ example: 'Frontend' })
  name!: string;

  @ApiProperty({ example: 'frontend' })
  slug!: string;
}

class CompetencyMatrixCompetencyDto {
  @ApiProperty({ example: 'cm8competency1' })
  id!: string;

  @ApiProperty({ type: CompetencyMatrixStackDto })
  stack!: CompetencyMatrixStackDto;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiProperty({ example: 'typescript' })
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiProperty({ example: 7 })
  totalCount!: number;

  @ApiProperty({ example: 4 })
  correctCount!: number;

  @ApiProperty({ example: 2 })
  partialCount!: number;

  @ApiProperty({ example: 1 })
  incorrectCount!: number;

  @ApiProperty({ example: 57 })
  accuracy!: number;

  @ApiProperty({ enum: TrainingResult, nullable: true })
  lastResult!: TrainingResult | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastAssessedAt!: string | null;
}

export class CompetencyMatrixUserResponseDto {
  @ApiProperty({ type: CompetencyMatrixUserDto })
  user!: CompetencyMatrixUserDto;

  @ApiProperty({ type: [CompetencyMatrixStackDto] })
  stacks!: CompetencyMatrixStackDto[];

  @ApiProperty({ type: [CompetencyMatrixCompetencyDto] })
  competencies!: CompetencyMatrixCompetencyDto[];
}

export class ListCompetencyMatrixResponseDto {
  @ApiProperty({ type: [CompetencyMatrixUserResponseDto] })
  items!: CompetencyMatrixUserResponseDto[];
}
