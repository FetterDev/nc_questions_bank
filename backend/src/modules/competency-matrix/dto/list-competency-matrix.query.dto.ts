import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListCompetencyMatrixQueryDto {
  @ApiPropertyOptional({ example: 'cm8stack1' })
  @IsOptional()
  @IsString()
  stackId?: string;
}
