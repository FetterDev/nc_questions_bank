import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({
    description: 'Название темы',
    maxLength: 100,
    example: 'Vue',
  })
  @IsString()
  @MaxLength(100)
  name!: string;
}
