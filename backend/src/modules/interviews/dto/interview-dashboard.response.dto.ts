import { ApiProperty } from '@nestjs/swagger';
import {
  InterviewFeedbackEntryDto,
  InterviewItemDto,
  InterviewResultsSummaryDto,
  InterviewUserDto,
  InterviewWeakTopicDto,
} from './interview-common.dto';

class InterviewDashboardSummaryDto extends InterviewResultsSummaryDto {
  @ApiProperty({ example: 12 })
  totalInterviews!: number;

  @ApiProperty({ example: 2 })
  draftCount!: number;

  @ApiProperty({ example: 3 })
  plannedCount!: number;

  @ApiProperty({ example: 4 })
  scheduledCount!: number;

  @ApiProperty({ example: 3 })
  completedCount!: number;
}

class InterviewDashboardScheduleSeriesItemDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-03-09' })
  bucketStart!: string;

  @ApiProperty({ example: 2 })
  draftCount!: number;

  @ApiProperty({ example: 1 })
  plannedCount!: number;

  @ApiProperty({ example: 3 })
  scheduledCount!: number;

  @ApiProperty({ example: 2 })
  completedCount!: number;

  @ApiProperty({ example: 0 })
  overdueCount!: number;
}

class InterviewDashboardOutcomeMixDto {
  @ApiProperty({ example: 12 })
  correctCount!: number;

  @ApiProperty({ example: 8 })
  partialCount!: number;

  @ApiProperty({ example: 5 })
  incorrectCount!: number;
}

class InterviewDashboardInterviewerLoadItemDto {
  @ApiProperty({ type: InterviewUserDto })
  interviewer!: InterviewUserDto;

  @ApiProperty({ example: 4 })
  assignedCount!: number;

  @ApiProperty({ example: 3 })
  completedCount!: number;
}

class InterviewDashboardRecentItemDto extends InterviewItemDto {}

export class AdminInterviewDashboardResponseDto {
  @ApiProperty({ type: InterviewDashboardSummaryDto })
  summary!: InterviewDashboardSummaryDto;

  @ApiProperty({ type: [InterviewDashboardScheduleSeriesItemDto] })
  scheduleSeries!: InterviewDashboardScheduleSeriesItemDto[];

  @ApiProperty({ type: InterviewDashboardOutcomeMixDto })
  outcomeMix!: InterviewDashboardOutcomeMixDto;

  @ApiProperty({ type: [InterviewDashboardInterviewerLoadItemDto] })
  interviewerLoad!: InterviewDashboardInterviewerLoadItemDto[];

  @ApiProperty({ type: [InterviewWeakTopicDto] })
  weakTopics!: InterviewWeakTopicDto[];

  @ApiProperty({ type: [InterviewDashboardRecentItemDto] })
  upcoming!: InterviewDashboardRecentItemDto[];

  @ApiProperty({ type: [InterviewDashboardRecentItemDto] })
  recentCompleted!: InterviewDashboardRecentItemDto[];
}

class MyInterviewDashboardOutcomeSeriesItemDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-03-09' })
  bucketStart!: string;

  @ApiProperty({ example: 2 })
  correctCount!: number;

  @ApiProperty({ example: 1 })
  partialCount!: number;

  @ApiProperty({ example: 1 })
  incorrectCount!: number;
}

export class MyInterviewDashboardResponseDto {
  @ApiProperty({ type: InterviewDashboardSummaryDto })
  summary!: InterviewDashboardSummaryDto;

  @ApiProperty({ type: [MyInterviewDashboardOutcomeSeriesItemDto] })
  outcomeSeries!: MyInterviewDashboardOutcomeSeriesItemDto[];

  @ApiProperty({ type: [InterviewWeakTopicDto] })
  weakTopics!: InterviewWeakTopicDto[];

  @ApiProperty({ type: [InterviewFeedbackEntryDto] })
  feedbackEntries!: InterviewFeedbackEntryDto[];

  @ApiProperty({ type: [InterviewDashboardRecentItemDto] })
  recentInterviews!: InterviewDashboardRecentItemDto[];
}
