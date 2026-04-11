import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class MeDto {
  @ApiProperty({ example: 'cm8q4x7r10001s2t3u4v5w6x7' })
  id!: string;

  @ApiProperty({ example: 'nord.admin' })
  login!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'nord.admin@example.com',
  })
  email!: string | null;

  @ApiProperty({ example: 'Nord Admin' })
  displayName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;
}
