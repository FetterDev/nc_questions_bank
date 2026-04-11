import { ApiProperty } from '@nestjs/swagger';
import { InterviewCycleDetailDto } from './interview-common.dto';

export class InterviewCycleDetailResponseDto extends InterviewCycleDetailDto {
  @ApiProperty({ example: 2 })
  draftCount!: number;

  @ApiProperty({ example: 1 })
  plannedCount!: number;

  @ApiProperty({ example: 3 })
  scheduledCount!: number;

  @ApiProperty({ example: 0 })
  completedCount!: number;
}
