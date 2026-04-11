import { ApiProperty } from '@nestjs/swagger';
import { QuestionTopicDto } from '../../questions/dto/question-topic.dto';

export class TrainingPresetDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1preset' })
  id!: string;

  @ApiProperty({ example: 'Angular Developer' })
  name!: string;

  @ApiProperty({ type: [QuestionTopicDto] })
  topics!: QuestionTopicDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
