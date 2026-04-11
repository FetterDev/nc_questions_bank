import { ApiProperty } from '@nestjs/swagger';
import { TopicDto } from './topic.dto';

class ListTopicsAppliedFiltersDto {
  @ApiProperty({ nullable: true, example: 'react' })
  q!: string | null;

  @ApiProperty({ example: true })
  usedOnly!: boolean;
}

class ListTopicsMetaDto {
  @ApiProperty({ example: 7 })
  tookMs!: number;

  @ApiProperty({ type: ListTopicsAppliedFiltersDto })
  appliedFilters!: ListTopicsAppliedFiltersDto;
}

export class ListTopicsResponseDto {
  @ApiProperty({ type: [TopicDto] })
  items!: TopicDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ type: ListTopicsMetaDto })
  meta!: ListTopicsMetaDto;
}
