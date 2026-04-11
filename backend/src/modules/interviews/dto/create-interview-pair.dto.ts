import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInterviewPairDto {
  @ApiProperty({ example: 'cm8user1' })
  @IsString()
  interviewerId!: string;

  @ApiProperty({ example: 'cm8user2' })
  @IsString()
  intervieweeId!: string;
}
