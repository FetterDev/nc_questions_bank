import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CompetencyStackDto {
  @ApiProperty({ example: 'cm8q4x7r10001stack' })
  id!: string;

  @ApiProperty({ example: 'Frontend' })
  name!: string;

  @ApiProperty({ example: 'frontend' })
  slug!: string;
}

export class CompetencyDto {
  @ApiProperty({ example: 'cm8q4x7r10001competency' })
  id!: string;

  @ApiProperty({ example: 'cm8q4x7r10001stack' })
  stackId!: string;

  @ApiProperty({ type: CompetencyStackDto })
  stack!: CompetencyStackDto;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiProperty({ example: 'typescript' })
  slug!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Static typing and type-system tradeoffs.',
  })
  description!: string | null;

  @ApiProperty({ example: 1 })
  position!: number;
}
