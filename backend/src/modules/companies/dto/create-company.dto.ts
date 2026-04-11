import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Название компании',
    maxLength: 100,
    example: 'Google',
  })
  @IsString()
  @MaxLength(100)
  name!: string;
}
