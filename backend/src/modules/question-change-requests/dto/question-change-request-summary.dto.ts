import { ApiProperty } from '@nestjs/swagger';
import {
  QuestionChangeRequestStatus,
  QuestionChangeRequestType,
} from '@prisma/client';
import { QuestionChangeRequestActorDto } from './question-change-request-actor.dto';

export class QuestionChangeRequestSummaryDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ enum: QuestionChangeRequestType })
  type!: QuestionChangeRequestType;

  @ApiProperty({ enum: QuestionChangeRequestStatus })
  status!: QuestionChangeRequestStatus;

  @ApiProperty({
    nullable: true,
    example: 'cm7y5z8qv0001x4f2w7sn1aaa',
  })
  targetQuestionId!: string | null;

  @ApiProperty({ example: 'Что такое MVCC?' })
  subject!: string;

  @ApiProperty({ type: QuestionChangeRequestActorDto })
  author!: QuestionChangeRequestActorDto;

  @ApiProperty({
    type: QuestionChangeRequestActorDto,
    nullable: true,
  })
  reviewer!: QuestionChangeRequestActorDto | null;

  @ApiProperty({ nullable: true })
  reviewComment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  reviewedAt!: string | null;
}
