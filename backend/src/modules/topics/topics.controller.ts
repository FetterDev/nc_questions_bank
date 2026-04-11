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
import { CreateTopicDto } from './dto/create-topic.dto';
import { ListTopicsQueryDto } from './dto/list-topics.query.dto';
import { ListTopicsResponseDto } from './dto/list-topics.response.dto';
import { TopicDto } from './dto/topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicsService } from './topics.service';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @ApiOperation({ summary: 'Список тем' })
  @ApiOkResponse({ type: ListTopicsResponseDto })
  @Roles(...ALL_ROLES)
  @Get()
  list(@Query() query: ListTopicsQueryDto) {
    return this.topicsService.list(query);
  }

  @ApiOperation({ summary: 'Создать тему' })
  @ApiCreatedResponse({ type: TopicDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post()
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.create(dto);
  }

  @ApiOperation({ summary: 'Переименовать тему' })
  @ApiOkResponse({ type: TopicDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topicsService.update(id, dto);
  }
}
