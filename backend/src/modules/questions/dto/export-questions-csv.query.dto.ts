import { OmitType } from '@nestjs/swagger';
import { SearchQuestionsQueryDto } from '../../search/dto/search-questions.query.dto';

export class ExportQuestionsCsvQueryDto extends OmitType(
  SearchQuestionsQueryDto,
  ['limit', 'offset'] as const,
) {}
