import { ApiProperty } from '@nestjs/swagger';
import { StackDto } from './stack.dto';

class ListStacksMetaDto {
  @ApiProperty({ example: 4 })
  tookMs!: number;

  @ApiProperty({
    example: {
      q: null,
    },
  })
  appliedFilters!: {
    q: string | null;
  };
}

export class ListStacksResponseDto {
  @ApiProperty({ type: [StackDto] })
  items!: StackDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ type: ListStacksMetaDto })
  meta!: ListStacksMetaDto;
}

