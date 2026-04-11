import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateTopicDto {
  @ApiProperty({
    description: 'Новое название темы',
    maxLength: 100,
    example: 'React Router',
  })
  @IsString()
  @MaxLength(100)
  name!: string;
}
