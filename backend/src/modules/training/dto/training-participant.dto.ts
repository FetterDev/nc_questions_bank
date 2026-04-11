import { ApiProperty } from '@nestjs/swagger';

export class TrainingParticipantDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'ivan.petrov' })
  login!: string;

  @ApiProperty({ example: 'Иван Петров' })
  displayName!: string;
}
