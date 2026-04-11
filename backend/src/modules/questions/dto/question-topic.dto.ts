import { ApiProperty } from '@nestjs/swagger';

export class QuestionTopicDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1abc' })
  id!: string;

  @ApiProperty({ example: 'JS' })
  name!: string;

  @ApiProperty({ example: 'js' })
  slug!: string;
}
