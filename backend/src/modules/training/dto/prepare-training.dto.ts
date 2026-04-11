import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class PrepareTrainingDto {
  @ApiProperty({
    type: [String],
    example: [
      'seed-topic-javascript',
      'seed-topic-typescript',
      'seed-topic-angular',
      'seed-topic-scss',
      'seed-topic-ngrx',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  topicIds!: string[];
}
