import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class InterviewCalendarQueryDto {
  @ApiPropertyOptional({
    example: '2026-03',
    description: 'По умолчанию текущий UTC-месяц',
  })
  @IsOptional()
  @IsString()
  month?: string;
}
