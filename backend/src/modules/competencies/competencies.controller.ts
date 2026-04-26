import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ALL_ROLES, MANAGER_ONLY_ROLES } from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { CompetenciesService } from './competencies.service';
import { CompetencyDto } from './dto/competency.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { CreateStackDto } from './dto/create-stack.dto';
import { ListCompetenciesQueryDto } from './dto/list-competencies.query.dto';
import { ListCompetenciesResponseDto } from './dto/list-competencies.response.dto';
import { ListStacksQueryDto } from './dto/list-stacks.query.dto';
import { ListStacksResponseDto } from './dto/list-stacks.response.dto';
import { StackDto } from './dto/stack.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { UpdateStackDto } from './dto/update-stack.dto';

@ApiTags('competencies')
@Controller()
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}

  @ApiOperation({ summary: 'Список стеков' })
  @ApiOkResponse({ type: ListStacksResponseDto })
  @Roles(...ALL_ROLES)
  @Get('stacks')
  listStacks(@Query() query: ListStacksQueryDto) {
    return this.competenciesService.listStacks(query);
  }

  @ApiOperation({ summary: 'Создать стек' })
  @ApiCreatedResponse({ type: StackDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post('stacks')
  createStack(@Body() dto: CreateStackDto) {
    return this.competenciesService.createStack(dto);
  }

  @ApiOperation({ summary: 'Переименовать стек' })
  @ApiOkResponse({ type: StackDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch('stacks/:id')
  updateStack(@Param('id') id: string, @Body() dto: UpdateStackDto) {
    return this.competenciesService.updateStack(id, dto);
  }

  @ApiOperation({ summary: 'Список компетенций' })
  @ApiOkResponse({ type: ListCompetenciesResponseDto })
  @Roles(...ALL_ROLES)
  @Get('competencies')
  listCompetencies(@Query() query: ListCompetenciesQueryDto) {
    return this.competenciesService.listCompetencies(query);
  }

  @ApiOperation({ summary: 'Создать компетенцию' })
  @ApiCreatedResponse({ type: CompetencyDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post('competencies')
  createCompetency(@Body() dto: CreateCompetencyDto) {
    return this.competenciesService.createCompetency(dto);
  }

  @ApiOperation({ summary: 'Обновить компетенцию' })
  @ApiOkResponse({ type: CompetencyDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch('competencies/:id')
  updateCompetency(@Param('id') id: string, @Body() dto: UpdateCompetencyDto) {
    return this.competenciesService.updateCompetency(id, dto);
  }
}
