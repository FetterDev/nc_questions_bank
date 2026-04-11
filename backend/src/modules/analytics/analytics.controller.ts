import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../authz/current-user.decorator';
import {
  MANAGER_ONLY_ROLES,
  USER_ONLY_ROLES,
} from '../authz/role-groups';
import { StrictRoles } from '../authz/strict-roles.decorator';
import { UserContext } from '../authz/user-context';
import { AnalyticsService } from './analytics.service';
import { BankAnalyticsResponseDto } from './dto/bank-analytics.response.dto';
import { GrowthAnalyticsResponseDto } from './dto/growth-analytics.response.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Точки роста текущего пользователя по истории тренировок' })
  @ApiOkResponse({ type: GrowthAnalyticsResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('growth')
  getGrowthAnalytics(@CurrentUser() currentUser: UserContext) {
    return this.analyticsService.getGrowthAnalytics(currentUser.id);
  }

  @ApiOperation({ summary: 'Анализ текущего опубликованного банка вопросов' })
  @ApiOkResponse({ type: BankAnalyticsResponseDto })
  @StrictRoles(...MANAGER_ONLY_ROLES)
  @Get('bank')
  getBankAnalytics() {
    return this.analyticsService.getBankAnalytics();
  }
}
