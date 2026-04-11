import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../authz/current-user.decorator';
import { ALL_ROLES } from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { UserContext } from '../authz/user-context';
import { SearchQuestionsQueryDto } from './dto/search-questions.query.dto';
import { SearchQuestionsResponseDto } from './dto/search-questions.response.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Поиск вопросов (raw SQL)' })
  @ApiOkResponse({ type: SearchQuestionsResponseDto })
  @Roles(...ALL_ROLES)
  @Get('questions')
  searchQuestions(
    @CurrentUser() currentUser: UserContext,
    @Query() query: SearchQuestionsQueryDto,
  ) {
    return this.searchService.searchQuestions(currentUser, query);
  }
}
