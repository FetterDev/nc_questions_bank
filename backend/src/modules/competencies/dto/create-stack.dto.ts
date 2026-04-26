import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateStackDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @Length(1, 120)
  name!: string;
}

