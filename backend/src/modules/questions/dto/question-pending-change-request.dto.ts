import { ApiProperty } from '@nestjs/swagger';

export class QuestionPendingChangeRequestDto {
  @ApiProperty({ example: true })
  hasPendingChangeRequest!: boolean;

  @ApiProperty({ example: false })
  hasMyPendingChangeRequest!: boolean;
}
