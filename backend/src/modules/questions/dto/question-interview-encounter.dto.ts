import { ApiProperty } from '@nestjs/swagger';

export class QuestionInterviewEncounterDto {
  @ApiProperty({ example: 12 })
  count!: number;

  @ApiProperty({ example: true })
  checkedByCurrentUser!: boolean;
}
