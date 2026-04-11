import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class InterviewDashboardQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date', example: '2026-02-16' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date', example: '2026-04-12' })
  @IsOptional()
  @IsString()
  to?: string;
}
