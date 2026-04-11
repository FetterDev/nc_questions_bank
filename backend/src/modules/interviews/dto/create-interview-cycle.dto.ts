import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateInterviewCycleDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-03-09' })
  @IsString()
  periodStart!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-03-15' })
  @IsString()
  periodEnd!: string;

  @ApiProperty({ type: [String], example: ['cm8user1', 'cm8user2', 'cm8user3'] })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  participantIds!: string[];
}
