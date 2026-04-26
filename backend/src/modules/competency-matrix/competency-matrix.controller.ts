import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../authz/current-user.decorator';
import { MANAGER_ONLY_ROLES, USER_ONLY_ROLES } from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { StrictRoles } from '../authz/strict-roles.decorator';
import { UserContext } from '../authz/user-context';
import { CompetencyMatrixService } from './competency-matrix.service';
import {
  CompetencyMatrixUserResponseDto,
  ListCompetencyMatrixResponseDto,
} from './dto/competency-matrix.response.dto';
import { ListCompetencyMatrixQueryDto } from './dto/list-competency-matrix.query.dto';
import { UpdateUserStacksDto } from './dto/update-user-stacks.dto';

@ApiTags('competency-matrix')
@Controller('competency-matrix')
export class CompetencyMatrixController {
  constructor(private readonly competencyMatrixService: CompetencyMatrixService) {}

  @ApiOperation({ summary: 'Моя матрица компетенций по завершённым интервью' })
  @ApiOkResponse({ type: CompetencyMatrixUserResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('me')
  getMyMatrix(@CurrentUser() currentUser: UserContext) {
    return this.competencyMatrixService.getMyMatrix(currentUser);
  }

  @ApiOperation({ summary: 'Матрицы компетенций сотрудников' })
  @ApiOkResponse({ type: ListCompetencyMatrixResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get()
  listMatrix(@Query() query: ListCompetencyMatrixQueryDto) {
    return this.competencyMatrixService.listMatrix(query);
  }

  @ApiOperation({ summary: 'Матрица компетенций сотрудника' })
  @ApiOkResponse({ type: CompetencyMatrixUserResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Get('users/:userId')
  getUserMatrix(@Param('userId') userId: string) {
    return this.competencyMatrixService.getUserMatrix(userId);
  }

  @ApiOperation({ summary: 'Назначить стеки сотруднику' })
  @ApiOkResponse({ type: CompetencyMatrixUserResponseDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch('users/:userId/stacks')
  updateUserStacks(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStacksDto,
  ) {
    return this.competencyMatrixService.updateUserStacks(userId, dto);
  }
}
