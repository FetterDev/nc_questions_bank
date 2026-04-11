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
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../authz/current-user.decorator';
import {
  ALL_ROLES,
  MANAGER_ONLY_ROLES,
  USER_ONLY_ROLES,
} from '../authz/role-groups';
import { Roles } from '../authz/roles.decorator';
import { UserContext } from '../authz/user-context';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ExportQuestionsCsvQueryDto } from './dto/export-questions-csv.query.dto';
import { QuestionCsvImportReportDto } from './dto/question-csv-import-report.dto';
import { QuestionInterviewEncounterDto } from './dto/question-interview-encounter.dto';
import { ListQuestionsQueryDto } from './dto/list-questions.query.dto';
import { QuestionDto } from './dto/question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsCsvService } from './questions-csv.service';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly questionsCsvService: QuestionsCsvService,
  ) {}

  @ApiOperation({ summary: 'Создать вопрос' })
  @ApiCreatedResponse({ type: QuestionDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Post()
  create(
    @CurrentUser() currentUser: UserContext,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(currentUser, dto);
  }

  @ApiOperation({ summary: 'Список вопросов (CRUD-выборка)' })
  @ApiOkResponse({ type: QuestionDto, isArray: true })
  @Roles(...ALL_ROLES)
  @Get()
  findAll(
    @CurrentUser() currentUser: UserContext,
    @Query() query: ListQuestionsQueryDto,
  ) {
    return this.questionsService.findAll(currentUser, query);
  }

  @ApiOperation({ summary: 'Экспорт вопросов в CSV' })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Roles(UserRole.ADMIN)
  @Get('export')
  async exportCsv(
    @Query() query: ExportQuestionsCsvQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exported = await this.questionsCsvService.buildExportCsv(query);
    const encodedFileName = encodeURIComponent(exported.fileName);

    response.setHeader('content-type', 'text/csv; charset=utf-8');
    response.setHeader(
      'content-disposition',
      `attachment; filename="${exported.fileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    return exported.content;
  }

  @ApiOperation({ summary: 'Получить вопрос по id' })
  @ApiOkResponse({ type: QuestionDto })
  @Roles(...ALL_ROLES)
  @Get(':id')
  findOne(@CurrentUser() currentUser: UserContext, @Param('id') id: string) {
    return this.questionsService.findOne(currentUser, id);
  }

  @ApiOperation({ summary: 'Обновить вопрос' })
  @ApiOkResponse({ type: QuestionDto })
  @Roles(...MANAGER_ONLY_ROLES)
  @Patch(':id')
  update(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(currentUser, id, dto);
  }

  @ApiOperation({ summary: 'Удалить вопрос' })
  @ApiNoContentResponse()
  @Roles(...MANAGER_ONLY_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.questionsService.remove(id);
  }

  @ApiOperation({ summary: 'Preview CSV import for questions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: QuestionCsvImportReportDto })
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewImport(@UploadedFile() file: { buffer: Buffer; originalname: string }) {
    return this.questionsCsvService.previewImport(file);
  }

  @ApiOperation({ summary: 'Commit CSV import for questions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: QuestionCsvImportReportDto })
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('import/commit')
  @UseInterceptors(FileInterceptor('file'))
  async commitImport(
    @UploadedFile() file: { buffer: Buffer; originalname: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const report = await this.questionsCsvService.commitImport(file);

    if (!report.applied) {
      response.status(HttpStatus.BAD_REQUEST);
    }

    return report;
  }

  @ApiOperation({ summary: 'Отметить вопрос как встреченный на собеседовании' })
  @ApiOkResponse({ type: QuestionInterviewEncounterDto })
  @Roles(...USER_ONLY_ROLES)
  @Put(':id/interview-encounter')
  markInterviewEncounter(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.questionsService.markInterviewEncounter(currentUser, id);
  }

  @ApiOperation({ summary: 'Снять отметку вопроса как встреченного на собеседовании' })
  @ApiOkResponse({ type: QuestionInterviewEncounterDto })
  @Roles(...USER_ONLY_ROLES)
  @Delete(':id/interview-encounter')
  unmarkInterviewEncounter(
    @CurrentUser() currentUser: UserContext,
    @Param('id') id: string,
  ) {
    return this.questionsService.unmarkInterviewEncounter(currentUser, id);
  }
}
