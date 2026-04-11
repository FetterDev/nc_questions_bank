import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  QuestionChangeRequestStatus,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../authz/current-user.decorator';
import {
  MANAGER_ONLY_ROLES,
  USER_AND_MANAGER_ROLES,
  USER_ONLY_ROLES,
} from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { UserContext } from '../authz/user-context';
import { CreateQuestionChangeRequestDto } from './dto/create-question-change-request.dto';
import { QuestionChangeRequestDetailDto } from './dto/question-change-request-detail.dto';
import { QuestionChangeRequestSummaryDto } from './dto/question-change-request-summary.dto';
import { RejectQuestionChangeRequestDto } from './dto/reject-question-change-request.dto';
import { QuestionChangeRequestsService } from './question-change-requests.service';

@ApiTags('question-change-requests')
@Controller('question-change-requests')
export class QuestionChangeRequestsController {
  constructor(
    private readonly questionChangeRequestsService: QuestionChangeRequestsService,
  ) {}

  @ApiOperation({ summary: 'Создать заявку на изменение вопроса' })
  @ApiCreatedResponse({ type: QuestionChangeRequestDetailDto })
  @Roles(...USER_ONLY_ROLES)
  @Post()
  create(
    @CurrentUser() currentUser: UserContext,
    @Body() dto: CreateQuestionChangeRequestDto,
  ) {
    return this.questionChangeRequestsService.create(currentUser, dto);
  }

  @ApiOperation({ summary: 'Список моих заявок' })
  @ApiOkResponse({ type: QuestionChangeRequestSummaryDto, isArray: true })
  @Roles(...USER_ONLY_ROLES)
  @Get('my')
  listMine(@CurrentUser() currentUser: UserContext) {
    return this.questionChangeRequestsService.listMine(currentUser);
  }

  @ApiOperation({ summary: 'Очередь заявок на ревью' })
  @ApiOkResponse({ type: QuestionChangeRequestSummaryDto, isArray: true })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('review')
  listReviewQueue() {
    return this.questionChangeRequestsService.listReviewQueue(
      QuestionChangeRequestStatus.PENDING,
    );
  }

  @ApiOperation({ summary: 'Детали заявки на изменение вопроса' })
  @ApiOkResponse({ type: QuestionChangeRequestDetailDto })
  @Roles(...USER_AND_MANAGER_ROLES)
  @Get(':id')
  findOne(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.questionChangeRequestsService.findOne(currentUser, id);
  }

  @ApiOperation({ summary: 'Одобрить заявку' })
  @ApiOkResponse({ type: QuestionChangeRequestDetailDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.questionChangeRequestsService.approve(currentUser, id);
  }

  @ApiOperation({ summary: 'Отклонить заявку' })
  @ApiOkResponse({ type: QuestionChangeRequestDetailDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
    @Body() dto: RejectQuestionChangeRequestDto,
  ) {
    return this.questionChangeRequestsService.reject(
      currentUser,
      id,
      dto.reviewComment,
    );
  }
}
