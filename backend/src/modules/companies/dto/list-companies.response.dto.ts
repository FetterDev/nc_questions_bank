import { ApiProperty } from '@nestjs/swagger';
import { CompanyDto } from './company.dto';

class ListCompaniesAppliedFiltersDto {
  @ApiProperty({ nullable: true, example: 'google' })
  q!: string | null;
}

class ListCompaniesMetaDto {
  @ApiProperty({ example: 9 })
  tookMs!: number;

  @ApiProperty({ type: ListCompaniesAppliedFiltersDto })
  appliedFilters!: ListCompaniesAppliedFiltersDto;
}

export class ListCompaniesResponseDto {
  @ApiProperty({ type: [CompanyDto] })
  items!: CompanyDto[];

  @ApiProperty({ example: 15 })
  total!: number;

  @ApiProperty({ type: ListCompaniesMetaDto })
  meta!: ListCompaniesMetaDto;
}
