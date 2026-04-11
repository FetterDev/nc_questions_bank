import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import {
  LOGIN_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/auth.constants';

export class CreateUserDto {
  @ApiProperty({ example: 'nord.user' })
  @IsString()
  @Matches(LOGIN_PATTERN)
  login!: string;

  @ApiProperty({
    example: 'user-password-2026',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty({ example: 'Nord User' })
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'nord.user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @IsEnum(UserRole)
  role!: UserRole;
}
