import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { StackDto } from '../../competencies/dto/stack.dto';

export class UserDto {
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

  @ApiProperty({ type: [StackDto] })
  stacks!: StackDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
