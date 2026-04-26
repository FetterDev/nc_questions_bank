import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { UserDto } from './user.dto';

class ListUsersAppliedFiltersDto {
  @ApiProperty({ type: String, nullable: true, example: 'nord' })
  q!: string | null;

  @ApiProperty({ nullable: true, enum: UserRole, example: UserRole.ADMIN })
  role!: UserRole | null;

  @ApiProperty({
    nullable: true,
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus | null;

  @ApiProperty({ type: String, nullable: true, example: 'cm8q4x7r10001stack' })
  stackId!: string | null;
}

class ListUsersMetaDto {
  @ApiProperty({ example: 7 })
  tookMs!: number;

  @ApiProperty({ type: ListUsersAppliedFiltersDto })
  appliedFilters!: ListUsersAppliedFiltersDto;
}

export class ListUsersResponseDto {
  @ApiProperty({ type: [UserDto] })
  items!: UserDto[];

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ type: ListUsersMetaDto })
  meta!: ListUsersMetaDto;
}
