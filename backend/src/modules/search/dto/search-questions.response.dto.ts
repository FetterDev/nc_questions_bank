import { ApiProperty } from '@nestjs/swagger';
import { QuestionDto } from '../../questions/dto/question.dto';
import { QuestionDifficulty } from '../../questions/question-difficulty';
import { SearchSort } from './search-questions.query.dto';

class SearchAppliedFiltersDto {
  @ApiProperty({
    enum: QuestionDifficulty,
    isArray: true,
    example: [QuestionDifficulty.JUNIOR, QuestionDifficulty.MIDDLE],
  })
  difficulty!: QuestionDifficulty[];

  @ApiProperty({ type: [String], example: ['cm7y5z8qv0003x4f2w7sn1abc'] })
  topicIds!: string[];

  @ApiProperty({ nullable: true, example: 'google' })
  companyQuery!: string | null;

  @ApiProperty({ enum: SearchSort, example: SearchSort.RELEVANCE })
  sort!: SearchSort;
}

class SearchMetaDto {
  @ApiProperty({ example: 14 })
  tookMs!: number;

  @ApiProperty({ type: SearchAppliedFiltersDto })
  appliedFilters!: SearchAppliedFiltersDto;
}

export class SearchQuestionsResponseDto {
  @ApiProperty({ type: [QuestionDto] })
  items!: QuestionDto[];

  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ type: SearchMetaDto })
  meta!: SearchMetaDto;
}
