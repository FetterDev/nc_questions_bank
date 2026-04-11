import { ApiProperty } from '@nestjs/swagger';
import {
  InterviewCalendarDayDto,
  InterviewCycleDetailDto,
  InterviewItemDto,
} from './interview-common.dto';

export class AdminInterviewCalendarResponseDto {
  @ApiProperty({ example: '2026-03' })
  month!: string;

  @ApiProperty({ type: [InterviewCalendarDayDto] })
  days!: InterviewCalendarDayDto[];

  @ApiProperty({ type: [InterviewItemDto] })
  items!: InterviewItemDto[];

  @ApiProperty({
    type: InterviewCycleDetailDto,
    nullable: true,
  })
  activeCycle!: InterviewCycleDetailDto | null;
}

export class MyInterviewCalendarItemDto extends InterviewItemDto {
  @ApiProperty({
    enum: ['interviewer', 'interviewee'],
    example: 'interviewer',
  })
  myRole!: 'interviewer' | 'interviewee';
}

export class MyInterviewCalendarResponseDto {
  @ApiProperty({ example: '2026-03' })
  month!: string;

  @ApiProperty({ type: [InterviewCalendarDayDto] })
  days!: InterviewCalendarDayDto[];

  @ApiProperty({ type: [MyInterviewCalendarItemDto] })
  items!: MyInterviewCalendarItemDto[];
}
