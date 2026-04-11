import { ApiProperty } from '@nestjs/swagger';
import { InterviewCycleMode, InterviewStatus } from '@prisma/client';

export class InterviewUserDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'ivan.petrov' })
  login!: string;

  @ApiProperty({ example: 'Иван Петров' })
  displayName!: string;
}

export class InterviewPresetDto {
  @ApiProperty({ example: 'cm8q4x7r10001preset' })
  id!: string;

  @ApiProperty({ example: 'Angular Developer' })
  name!: string;
}

export class InterviewResultsSummaryDto {
  @ApiProperty({ example: 10 })
  resultsCount!: number;

  @ApiProperty({ example: 4 })
  correctCount!: number;

  @ApiProperty({ example: 3 })
  incorrectCount!: number;

  @ApiProperty({ example: 3 })
  partialCount!: number;
}

export class InterviewItemDto extends InterviewResultsSummaryDto {
  @ApiProperty({ example: 'cm8q4x7r10001interview' })
  id!: string;

  @ApiProperty({ enum: InterviewStatus, example: InterviewStatus.SCHEDULED })
  status!: InterviewStatus;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-03-11',
  })
  plannedDate!: string | null;

  @ApiProperty({
    type: InterviewPresetDto,
    nullable: true,
  })
  preset!: InterviewPresetDto | null;

  @ApiProperty({ type: InterviewUserDto })
  interviewer!: InterviewUserDto;

  @ApiProperty({ type: InterviewUserDto })
  interviewee!: InterviewUserDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  completedAt!: string | null;
}

export class InterviewCycleDetailDto {
  @ApiProperty({ example: 'cm8q4x7r10001cycle' })
  id!: string;

  @ApiProperty({ enum: InterviewCycleMode, example: InterviewCycleMode.AUTO })
  mode!: InterviewCycleMode;

  @ApiProperty({ type: String, format: 'date', example: '2026-03-09' })
  periodStart!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-03-15' })
  periodEnd!: string;

  @ApiProperty({ type: InterviewUserDto })
  createdByAdmin!: InterviewUserDto;

  @ApiProperty({ type: [InterviewItemDto] })
  interviews!: InterviewItemDto[];
}

export class InterviewCalendarDayDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-03-11' })
  date!: string;
}

export class InterviewFeedbackEntryDto {
  @ApiProperty({ example: 'cm8q4x7r10001interview' })
  interviewId!: string;

  @ApiProperty({
    type: InterviewUserDto,
    nullable: true,
  })
  interviewer!: InterviewUserDto | null;

  @ApiProperty({ example: 'Нужно точнее объяснять компромиссы.' })
  feedback!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  completedAt!: string;
}

export class InterviewWeakTopicDto {
  @ApiProperty({ example: 'seed-topic-angular' })
  topicId!: string;

  @ApiProperty({ example: 'Angular' })
  name!: string;

  @ApiProperty({ example: 4 })
  correctCount!: number;

  @ApiProperty({ example: 3 })
  partialCount!: number;

  @ApiProperty({ example: 2 })
  incorrectCount!: number;

  @ApiProperty({ example: 44 })
  accuracy!: number;
}
