import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInterviewDto {
  @ApiPropertyOptional({ example: 'cm8user1', nullable: true })
  @IsOptional()
  @IsString()
  interviewerId?: string | null;

  @ApiPropertyOptional({ example: 'cm8user2', nullable: true })
  @IsOptional()
  @IsString()
  intervieweeId?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-03-11',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  plannedDate?: string | null;

  @ApiPropertyOptional({ example: 'cm8preset1', nullable: true })
  @IsOptional()
  @IsString()
  presetId?: string | null;

  @ApiPropertyOptional({
    example: 'Нужно точнее формулировать компромиссы.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string | null;
}
