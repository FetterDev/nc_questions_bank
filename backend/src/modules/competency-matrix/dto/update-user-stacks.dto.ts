import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateUserStacksDto {
  @ApiProperty({
    type: [String],
    example: ['cm8q4x7r10001stack'],
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  stackIds!: string[];
}
