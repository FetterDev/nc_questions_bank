import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class QuestionChangeRequestActorDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'nord.user@example.com',
  })
  email!: string | null;

  @ApiProperty({ example: 'Nord User' })
  displayName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;
}
