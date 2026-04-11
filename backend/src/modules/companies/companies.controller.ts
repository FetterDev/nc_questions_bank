import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ALL_ROLES, MANAGER_ONLY_ROLES } from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyDto } from './dto/company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query.dto';
import { ListCompaniesResponseDto } from './dto/list-companies.response.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({ summary: 'Список компаний' })
  @ApiOkResponse({ type: ListCompaniesResponseDto })
  @Roles(...ALL_ROLES)
  @Get()
  list(@Query() query: ListCompaniesQueryDto) {
    return this.companiesService.list(query);
  }

  @ApiOperation({ summary: 'Создать компанию' })
  @ApiCreatedResponse({ type: CompanyDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @ApiOperation({ summary: 'Переименовать компанию' })
  @ApiOkResponse({ type: CompanyDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }
}
