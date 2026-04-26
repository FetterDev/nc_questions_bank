import { ApiProperty } from '@nestjs/swagger';

class QuestionCompetencyStackDto {
  @ApiProperty({ example: 'cm8q4x7r10001stack' })
  id!: string;

  @ApiProperty({ example: 'Frontend' })
  name!: string;

  @ApiProperty({ example: 'frontend' })
  slug!: string;
}

export class QuestionCompetencyDto {
  @ApiProperty({ example: 'cm8q4x7r10001competency' })
  id!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiProperty({ example: 'typescript' })
  slug!: string;

  @ApiProperty({ type: QuestionCompetencyStackDto })
  stack!: QuestionCompetencyStackDto;
}
