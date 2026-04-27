import { ApiProperty } from '@nestjs/swagger';

class TeamAnalyticsUserDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'ivan.petrov' })
  login!: string;

  @ApiProperty({ example: 'Иван Петров' })
  displayName!: string;
}

class TeamAnalyticsStackDto {
  @ApiProperty({ example: 'cm8stack1' })
  id!: string;

  @ApiProperty({ example: 'Frontend' })
  name!: string;

  @ApiProperty({ example: 'frontend' })
  slug!: string;
}

class TeamAnalyticsEmployeeSummaryDto {
  @ApiProperty({ example: 42 })
  totalAnswers!: number;

  @ApiProperty({ example: 25 })
  correctCount!: number;

  @ApiProperty({ example: 6 })
  partialCount!: number;

  @ApiProperty({ example: 11 })
  incorrectCount!: number;

  @ApiProperty({ example: 60 })
  accuracy!: number;

  @ApiProperty({ example: 8 })
  trainingSessionsCount!: number;

  @ApiProperty({ example: 3 })
  completedInterviewsCount!: number;

  @ApiProperty({ example: 4 })
  feedbackCount!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastActivityAt!: string | null;
}

class TeamAnalyticsGrowthTopicDto {
  @ApiProperty({ example: 'seed-topic-angular' })
  topicId!: string;

  @ApiProperty({ example: 'Angular' })
  name!: string;

  @ApiProperty({ example: 'angular' })
  slug!: string;

  @ApiProperty({ example: 3 })
  correctCount!: number;

  @ApiProperty({ example: 2 })
  partialCount!: number;

  @ApiProperty({ example: 5 })
  incorrectCount!: number;

  @ApiProperty({ example: 30 })
  accuracy!: number;
}

class TeamAnalyticsSummaryDto {
  @ApiProperty({ example: 18 })
  employeesCount!: number;

  @ApiProperty({ example: 14 })
  employeesWithAnswersCount!: number;

  @ApiProperty({ example: 410 })
  totalAnswers!: number;

  @ApiProperty({ example: 67 })
  averageAccuracy!: number;
}

class TeamAnalyticsEmployeeDto {
  @ApiProperty({ type: TeamAnalyticsUserDto })
  user!: TeamAnalyticsUserDto;

  @ApiProperty({ type: [TeamAnalyticsStackDto] })
  stacks!: TeamAnalyticsStackDto[];

  @ApiProperty({ type: TeamAnalyticsEmployeeSummaryDto })
  summary!: TeamAnalyticsEmployeeSummaryDto;

  @ApiProperty({ type: [TeamAnalyticsGrowthTopicDto] })
  growthTopics!: TeamAnalyticsGrowthTopicDto[];
}

export class TeamAnalyticsResponseDto {
  @ApiProperty({ type: TeamAnalyticsSummaryDto })
  summary!: TeamAnalyticsSummaryDto;

  @ApiProperty({ type: [TeamAnalyticsEmployeeDto] })
  items!: TeamAnalyticsEmployeeDto[];
}
