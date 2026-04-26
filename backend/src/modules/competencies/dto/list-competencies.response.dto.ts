import { ApiProperty } from '@nestjs/swagger';
import { CompetencyDto } from './competency.dto';

class ListCompetenciesMetaDto {
  @ApiProperty({ example: 4 })
  tookMs!: number;

  @ApiProperty({
    example: {
      q: null,
      stackId: null,
    },
  })
  appliedFilters!: {
    q: string | null;
    stackId: string | null;
  };
}

export class ListCompetenciesResponseDto {
  @ApiProperty({ type: [CompetencyDto] })
  items!: CompetencyDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ type: ListCompetenciesMetaDto })
  meta!: ListCompetenciesMetaDto;
}

