import { ApiProperty } from '@nestjs/swagger';
import { QuestionCompanyDto } from '../../questions/dto/question-company.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import {
  QuestionChangeRequestSummaryDto,
} from './question-change-request-summary.dto';
import {
  QuestionSnapshotDto,
  QuestionSnapshotTopicDto,
} from './question-snapshot.dto';

class QuestionTextDiffDto {
  @ApiProperty()
  changed!: boolean;

  @ApiProperty({ nullable: true })
  before!: string | null;

  @ApiProperty({ nullable: true })
  after!: string | null;
}

class QuestionDifficultyDiffDto {
  @ApiProperty()
  changed!: boolean;

  @ApiProperty({ enum: QuestionDifficulty, nullable: true })
  before!: QuestionDifficulty | null;

  @ApiProperty({ enum: QuestionDifficulty, nullable: true })
  after!: QuestionDifficulty | null;
}

class QuestionCompanyDiffDto {
  @ApiProperty()
  changed!: boolean;

  @ApiProperty({ type: QuestionCompanyDto, nullable: true })
  before!: QuestionCompanyDto | null;

  @ApiProperty({ type: QuestionCompanyDto, nullable: true })
  after!: QuestionCompanyDto | null;
}

class QuestionTopicsDiffDto {
  @ApiProperty()
  changed!: boolean;

  @ApiProperty({ type: [QuestionSnapshotTopicDto] })
  before!: QuestionSnapshotTopicDto[];

  @ApiProperty({ type: [QuestionSnapshotTopicDto] })
  after!: QuestionSnapshotTopicDto[];

  @ApiProperty({ type: [QuestionSnapshotTopicDto] })
  added!: QuestionSnapshotTopicDto[];

  @ApiProperty({ type: [QuestionSnapshotTopicDto] })
  removed!: QuestionSnapshotTopicDto[];
}

class QuestionChangeRequestFieldDiffsDto {
  @ApiProperty({ type: QuestionTextDiffDto })
  text!: QuestionTextDiffDto;

  @ApiProperty({ type: QuestionTextDiffDto })
  answer!: QuestionTextDiffDto;

  @ApiProperty({ type: QuestionDifficultyDiffDto })
  difficulty!: QuestionDifficultyDiffDto;

  @ApiProperty({ type: QuestionCompanyDiffDto })
  company!: QuestionCompanyDiffDto;

  @ApiProperty({ type: QuestionTopicsDiffDto })
  topics!: QuestionTopicsDiffDto;
}

export class QuestionChangeRequestDetailDto extends QuestionChangeRequestSummaryDto {
  @ApiProperty({ type: QuestionSnapshotDto, nullable: true })
  before!: QuestionSnapshotDto | null;

  @ApiProperty({ type: QuestionSnapshotDto, nullable: true })
  after!: QuestionSnapshotDto | null;

  @ApiProperty({ type: QuestionChangeRequestFieldDiffsDto })
  fieldDiffs!: QuestionChangeRequestFieldDiffsDto;
}
