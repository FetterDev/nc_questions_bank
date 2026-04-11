import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateTrainingPresetDto {
  @ApiProperty({ example: 'Angular Developer' })
  @IsString()
  name!: string;

  @ApiProperty({
    type: [String],
    example: [
      'seed-topic-javascript',
      'seed-topic-typescript',
      'seed-topic-angular',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  topicIds!: string[];
}
