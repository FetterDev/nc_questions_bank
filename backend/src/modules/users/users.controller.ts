import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { CurrentUser } from '../authz/current-user.decorator';
import { ALL_ROLES } from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { UserContext } from '../authz/user-context';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { ListUsersResponseDto } from './dto/list-users.response.dto';
import { MeDto } from './dto/me.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: MeDto })
  @Roles(...ALL_ROLES)
  @Get('me')
  getMe(@CurrentUser() currentUser: UserContext) {
    return this.usersService.getMe(currentUser);
  }

  @ApiOperation({ summary: 'Список пользователей' })
  @ApiOkResponse({ type: ListUsersResponseDto })
  @Roles(UserRole.ADMIN)
  @Get('users')
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @ApiOperation({ summary: 'Создать пользователя' })
  @ApiCreatedResponse({ type: UserDto })
  @Roles(UserRole.ADMIN)
  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: 'Обновить пользователя' })
  @ApiOkResponse({ type: UserDto })
  @Roles(UserRole.ADMIN)
  @Patch('users/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: UserContext,
  ) {
    return this.usersService.update(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Сбросить пароль пользователя' })
  @ApiOkResponse({ type: UserDto })
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }

  @ApiOperation({ summary: 'Деактивировать пользователя' })
  @ApiOkResponse({ type: UserDto })
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post('users/:id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() currentUser: UserContext) {
    return this.usersService.deactivate(id, currentUser);
  }

  @ApiOperation({ summary: 'Активировать пользователя' })
  @ApiOkResponse({ type: UserDto })
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post('users/:id/activate')
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }
}
