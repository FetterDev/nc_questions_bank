import { ApiProperty } from '@nestjs/swagger';

export class TopicDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1abc' })
  id!: string;

  @ApiProperty({ example: 'JavaScript' })
  name!: string;

  @ApiProperty({ example: 'javascript' })
  slug!: string;

  @ApiProperty({ example: 42 })
  questionsCount!: number;
}
