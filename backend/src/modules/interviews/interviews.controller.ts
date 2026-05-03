import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../authz/current-user.decorator';
import {
  MANAGER_ONLY_ROLES,
  USER_ONLY_ROLES,
} from '../authz/role-groups';
import { StrictRoles } from '../authz/strict-roles.decorator';
import { UserContext } from '../authz/user-context';
import { Roles } from '../authz/roles.decorator';
import { CompleteInterviewDto } from './dto/complete-interview.dto';
import { CreateInterviewCycleDto } from './dto/create-interview-cycle.dto';
import { CreateInterviewPairDto } from './dto/create-interview-pair.dto';
import { AdminInterviewCalendarResponseDto, MyInterviewCalendarResponseDto } from './dto/interview-calendar.response.dto';
import { InterviewCalendarQueryDto } from './dto/interview-calendar.query.dto';
import { InterviewCycleDetailResponseDto } from './dto/interview-cycle-detail.response.dto';
import { AdminInterviewDashboardResponseDto, MyInterviewDashboardResponseDto } from './dto/interview-dashboard.response.dto';
import { InterviewDashboardQueryDto } from './dto/interview-dashboard.query.dto';
import { InterviewHistoryDetailResponseDto, ListInterviewHistoryResponseDto } from './dto/interview-history.response.dto';
import { InterviewItemDto } from './dto/interview-common.dto';
import { InterviewRuntimeResponseDto } from './dto/interview-runtime.response.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InterviewsService } from './interviews.service';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @ApiOperation({ summary: 'Создать weekly cycle и автосгенерировать draft-пары' })
  @ApiCreatedResponse({ type: InterviewCycleDetailResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post('cycles')
  createCycle(
    @CurrentUser() currentUser: UserContext,
    @Body() dto: CreateInterviewCycleDto,
  ) {
    return this.interviewsService.createCycle(currentUser, dto);
  }

  @ApiOperation({ summary: 'Детали interview cycle' })
  @ApiOkResponse({ type: InterviewCycleDetailResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('cycles/:id')
  getCycleDetail(@Param('id') id: string) {
    return this.interviewsService.getCycleDetail(id);
  }

  @ApiOperation({ summary: 'Ручное создание пары в cycle' })
  @ApiCreatedResponse({ type: InterviewItemDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post('cycles/:id/pairs')
  createPair(@Param('id') id: string, @Body() dto: CreateInterviewPairDto) {
    return this.interviewsService.createPair(id, dto);
  }

  @ApiOperation({ summary: 'Обновить интервью' })
  @ApiOkResponse({ type: InterviewItemDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch(':id')
  updateInterview(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.interviewsService.updateInterview(id, dto);
  }

  @ApiOperation({ summary: 'Удалить интервью' })
  @ApiNoContentResponse()
  @Roles(...MANAGER_ONLY_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInterview(@Param('id') id: string) {
    await this.interviewsService.removeInterview(id);
  }

  @ApiOperation({ summary: 'Админский month calendar интервью' })
  @ApiOkResponse({ type: AdminInterviewCalendarResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('admin-calendar')
  getAdminCalendar(@Query() query: InterviewCalendarQueryDto) {
    return this.interviewsService.getAdminCalendar(query);
  }

  @ApiOperation({ summary: 'Личный month calendar интервью' })
  @ApiOkResponse({ type: MyInterviewCalendarResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('my-calendar')
  getMyCalendar(
    @CurrentUser() currentUser: UserContext,
    @Query() query: InterviewCalendarQueryDto,
  ) {
    return this.interviewsService.getMyCalendar(currentUser, query);
  }

  @ApiOperation({ summary: 'Runtime payload интервью для interviewer' })
  @ApiOkResponse({ type: InterviewRuntimeResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get(':id/runtime')
  getRuntime(@CurrentUser() currentUser: UserContext, @Param('id') id: string) {
    return this.interviewsService.getRuntime(currentUser, id);
  }

  @ApiOperation({ summary: 'Завершить интервью как interviewer' })
  @ApiOkResponse({ type: InterviewItemDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeInterview(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.interviewsService.completeInterview(currentUser, id, dto);
  }

  @ApiOperation({ summary: 'Admin dashboard по интервью' })
  @ApiOkResponse({ type: AdminInterviewDashboardResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('admin-dashboard')
  getAdminDashboard(@Query() query: InterviewDashboardQueryDto) {
    return this.interviewsService.getAdminDashboard(query);
  }

  @ApiOperation({ summary: 'User dashboard по интервью' })
  @ApiOkResponse({ type: MyInterviewDashboardResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('my-dashboard')
  getMyDashboard(
    @CurrentUser() currentUser: UserContext,
    @Query() query: InterviewDashboardQueryDto,
  ) {
    return this.interviewsService.getMyDashboard(currentUser, query);
  }

  @ApiOperation({ summary: 'История завершённых интервью текущего user' })
  @ApiOkResponse({ type: ListInterviewHistoryResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('my-history')
  getMyHistory(@CurrentUser() currentUser: UserContext) {
    return this.interviewsService.getMyHistory(currentUser);
  }

  @ApiOperation({ summary: 'История завершённых интервью сотрудника' })
  @ApiOkResponse({ type: ListInterviewHistoryResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('users/:userId/history')
  getUserHistory(@Param('userId') userId: string) {
    return this.interviewsService.getUserHistory(userId);
  }

  @ApiOperation({ summary: 'Детали интервью с результатами и критериями' })
  @ApiOkResponse({ type: InterviewHistoryDetailResponseDto })
  @Roles(UserRole.USER, ...MANAGER_ONLY_ROLES)
  @Get(':id/detail')
  getInterviewDetail(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.interviewsService.getInterviewDetail(currentUser, id);
  }
}
