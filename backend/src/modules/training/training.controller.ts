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
  ALL_ROLES,
  MANAGER_ONLY_ROLES,
  USER_ONLY_ROLES,
} from '../authz/role-groups';
import { StrictRoles } from '../authz/strict-roles.decorator';
import { UserContext } from '../authz/user-context';
import { Roles } from '../authz/roles.decorator';
import { CreateTrainingPresetDto } from './dto/create-training-preset.dto';
import { ListTrainingHistoryResponseDto } from './dto/list-training-history.response.dto';
import { ListTrainingParticipantsResponseDto } from './dto/list-training-participants.response.dto';
import { PrepareTrainingDto } from './dto/prepare-training.dto';
import { PrepareTrainingResponseDto } from './dto/prepare-training.response.dto';
import { SaveTrainingResultsDto } from './dto/save-training-results.dto';
import { SaveTrainingResultsResponseDto } from './dto/save-training-results.response.dto';
import { TrainingHistoryDetailResponseDto } from './dto/training-history-detail.response.dto';
import { TrainingPresetDto } from './dto/training-preset.dto';
import { UpdateTrainingPresetDto } from './dto/update-training-preset.dto';
import { TrainingService } from './training.service';

@ApiTags('training')
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @ApiOperation({ summary: 'Список тренировочных пресетов' })
  @ApiOkResponse({ type: TrainingPresetDto, isArray: true })
  @Roles(...ALL_ROLES)
  @Get('presets')
  listPresets() {
    return this.trainingService.listPresets();
  }

  @ApiOperation({ summary: 'Список участников для взаимной тренировки' })
  @ApiOkResponse({ type: ListTrainingParticipantsResponseDto })
  @Roles(...USER_ONLY_ROLES)
  @Get('participants')
  listParticipants(@CurrentUser() currentUser: UserContext) {
    return this.trainingService.listParticipants(currentUser);
  }

  @ApiOperation({ summary: 'Создать тренировочный пресет' })
  @ApiCreatedResponse({ type: TrainingPresetDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post('presets')
  createPreset(@Body() dto: CreateTrainingPresetDto) {
    return this.trainingService.createPreset(dto);
  }

  @ApiOperation({ summary: 'Обновить тренировочный пресет' })
  @ApiOkResponse({ type: TrainingPresetDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch('presets/:id')
  updatePreset(@Param('id') id: string, @Body() dto: UpdateTrainingPresetDto) {
    return this.trainingService.updatePreset(id, dto);
  }

  @ApiOperation({ summary: 'Удалить тренировочный пресет' })
  @ApiNoContentResponse()
  @Roles(...MANAGER_ONLY_ROLES)
  @Delete('presets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePreset(@Param('id') id: string) {
    await this.trainingService.removePreset(id);
  }

  @ApiOperation({ summary: 'Подготовить тренировку по темам' })
  @ApiOkResponse({ type: PrepareTrainingResponseDto })
  @Roles(...USER_ONLY_ROLES)
  @Post('prepare')
  @HttpCode(HttpStatus.OK)
  prepareTraining(@Body() dto: PrepareTrainingDto) {
    return this.trainingService.prepareTraining(dto);
  }

  @ApiOperation({ summary: 'История сохранённых тренировок текущего пользователя' })
  @ApiOkResponse({ type: ListTrainingHistoryResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('history')
  listHistory(@CurrentUser() currentUser: UserContext) {
    return this.trainingService.listHistory(currentUser);
  }

  @ApiOperation({ summary: 'Детали сохранённой тренировки текущего пользователя' })
  @ApiOkResponse({ type: TrainingHistoryDetailResponseDto })
  @StrictRoles(...USER_ONLY_ROLES)
  @Get('history/:id')
  getHistoryDetail(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.trainingService.getHistoryDetail(currentUser, id);
  }

  @ApiOperation({ summary: 'Сохранить результаты тренировки' })
  @ApiCreatedResponse({ type: SaveTrainingResultsResponseDto })
  @Roles(...USER_ONLY_ROLES)
  @Post('results')
  saveTrainingResults(
    @CurrentUser() currentUser: UserContext,
    @Body() dto: SaveTrainingResultsDto,
  ) {
    return this.trainingService.saveTrainingResults(currentUser, dto);
  }
}
