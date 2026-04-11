import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiProperty({
    description: 'Новое название компании',
    maxLength: 100,
    example: 'Google Cloud',
  })
  @IsString()
  @MaxLength(100)
  name!: string;
}
