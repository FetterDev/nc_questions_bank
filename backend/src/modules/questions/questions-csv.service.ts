import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CompaniesRepository } from '../companies/companies.repository';
import { normalizeCompanyName } from '../companies/company-name';
import { QuestionChangeRequestsRepository } from '../question-change-requests/question-change-requests.repository';
import { SearchRepository } from '../search/search.repository';
import { SearchSort } from '../search/dto/search-questions.query.dto';
import { TopicsRepository } from '../topics/topics.repository';
import { buildTopicSlug, normalizeTopicName } from '../topics/topic-slug';
import { ExportQuestionsCsvQueryDto } from './dto/export-questions-csv.query.dto';
import {
  QuestionCsvImportReportDto,
  QuestionCsvImportRowSummary,
} from './dto/question-csv-import-report.dto';
import {
  QuestionDifficulty,
} from './question-difficulty';
import {
  QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
  QUESTION_CODE_LANGUAGES,
  QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
  QuestionCodeLanguage,
  QuestionStructuredContent,
  canonicalizeQuestionStructuredContent,
  getQuestionStructuredContentCode,
  getQuestionStructuredContentCodeLanguage,
  getQuestionStructuredContentText,
  joinQuestionStructuredContent,
  normalizeQuestionStructuredContent,
} from './question-structured-content';
import { QuestionOutput, QuestionsRepository } from './questions.repository';

type UploadedCsvFile = {
  buffer: Buffer;
  originalname: string;
};

type CsvDelimiter = ';' | ',';

type ParsedCsv = {
  delimiter: CsvDelimiter;
  rows: string[][];
};

type CsvFieldKey =
  | 'id'
  | 'topics'
  | 'questionText'
  | 'questionCode'
  | 'questionCodeLanguage'
  | 'answerText'
  | 'answerCode'
  | 'answerCodeLanguage'
  | 'difficulty'
  | 'company';

type CsvRowPlan = {
  rowNumber: number;
  summary: QuestionCsvImportRowSummary;
  errors: string[];
  warnings: string[];
  normalized: QuestionCsvImportReportDto['rows'][number]['normalized'];
  apply:
    | {
        id: string | null;
        textContent: QuestionStructuredContent;
        answerContent: QuestionStructuredContent;
        difficulty: QuestionDifficulty;
        companyName: string | null;
        companyKey: string | null;
        topicSlugs: string[];
      }
    | null;
};

type PreparedImport = {
  report: QuestionCsvImportReportDto;
  rowPlans: CsvRowPlan[];
  topicsToCreate: Array<{ name: string; slug: string }>;
  companiesToCreate: Array<{ key: string; name: string }>;
};

type ComparableQuestion = {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
  companyName: string | null;
  topicSlugs: string[];
};

const EXPORT_HEADERS = [
  'ID',
  'Темы',
  'Вопрос.Текст',
  'Вопрос.Код',
  'Вопрос.КодЯзык',
  'Ответ.Текст',
  'Ответ.Код',
  'Ответ.КодЯзык',
  'Сложность',
  'Компания',
] as const;

const CANONICAL_HEADERS: Record<string, CsvFieldKey> = {
  ID: 'id',
  Темы: 'topics',
  'Вопрос.Текст': 'questionText',
  'Вопрос.Код': 'questionCode',
  'Вопрос.КодЯзык': 'questionCodeLanguage',
  'Ответ.Текст': 'answerText',
  'Ответ.Код': 'answerCode',
  'Ответ.КодЯзык': 'answerCodeLanguage',
  Сложность: 'difficulty',
  Компания: 'company',
};

const LEGACY_HEADERS: Record<string, CsvFieldKey> = {
  Тема: 'topics',
  Вопрос: 'questionText',
  Ответ: 'answerText',
  'Сложность (1-3)': 'difficulty',
};

const IGNORED_HEADERS = new Set(['Автор', 'Контроль']);
const EXPORT_BATCH_SIZE = 250;

@Injectable()
export class QuestionsCsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionsRepository: QuestionsRepository,
    private readonly topicsRepository: TopicsRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
    private readonly searchRepository: SearchRepository,
  ) {}

  async buildExportCsv(query: ExportQuestionsCsvQueryDto) {
    const items = await this.loadQuestionsForExport(query);
    const rows = [
      EXPORT_HEADERS.join(';'),
      ...items.map((question) =>
        [
          question.id,
          question.topics.map((topic) => topic.name).join('|'),
          this.renderStructuredContentForCsvText(question.textContent),
          '',
          '',
          this.renderStructuredContentForCsvText(question.answerContent),
          '',
          '',
          question.difficulty,
          question.company?.name ?? '',
        ]
          .map((value) => this.escapeCsvCell(value, ';'))
          .join(';'),
      ),
    ];

    return {
      fileName: this.buildExportFileName(),
      content: `\uFEFF${rows.join('\r\n')}\r\n`,
    };
  }

  async previewImport(file: UploadedCsvFile) {
    return this.prepareImport(file, true).then((prepared) => prepared.report);
  }

  async commitImport(file: UploadedCsvFile) {
    const prepared = await this.prepareImport(file, true);

    if (prepared.report.totals.error > 0) {
      return prepared.report;
    }

    await this.prisma.$transaction(async (tx) => {
      const createdTopicsBySlug = new Map<string, { id: string; name: string }>();
      const createdCompaniesByKey = new Map<string, { id: string; name: string }>();

      for (const topic of prepared.topicsToCreate) {
        const created = await this.topicsRepository.create(
          {
            name: topic.name,
            slug: topic.slug,
          },
          tx,
        );
        createdTopicsBySlug.set(topic.slug, {
          id: created.id,
          name: topic.name,
        });
      }

      for (const company of prepared.companiesToCreate) {
        const created = await this.companiesRepository.create(
          {
            name: company.name,
          },
          tx,
        );
        createdCompaniesByKey.set(company.key, {
          id: created.id,
          name: company.name,
        });
      }

      const existingTopics = await this.topicsRepository.findBySlugs(
        prepared.rowPlans.flatMap((row) => row.apply?.topicSlugs ?? []),
        tx,
      );
      const topicIdsBySlug = new Map(existingTopics.map((topic) => [topic.slug, topic.id]));

      for (const [slug, topic] of createdTopicsBySlug.entries()) {
        topicIdsBySlug.set(slug, topic.id);
      }

      const companyNames = prepared.rowPlans.flatMap((row) =>
        row.apply?.companyName ? [row.apply.companyName] : [],
      );
      const existingCompanies = await this.companiesRepository.findByNamesInsensitive(
        companyNames,
        tx,
      );
      const companyIdsByKey = new Map(
        existingCompanies.map((company) => [
          company.name.trim().toLocaleLowerCase('ru-RU'),
          company.id,
        ]),
      );

      for (const [key, company] of createdCompaniesByKey.entries()) {
        companyIdsByKey.set(key, company.id);
      }

      for (const row of prepared.rowPlans) {
        if (!row.apply || row.summary === 'no_change' || row.summary === 'error') {
          continue;
        }

        const topicIds = row.apply.topicSlugs.map((slug) => {
          const topicId = topicIdsBySlug.get(slug);

          if (!topicId) {
            throw new BadRequestException(`Topic slug '${slug}' is invalid`);
          }

          return topicId;
        });

        const companyId = row.apply.companyKey
          ? companyIdsByKey.get(row.apply.companyKey) ?? null
          : null;

        if (row.summary === 'update' && row.apply.id) {
          await this.questionsRepository.update(
            row.apply.id,
            {
              text: this.joinStructuredContent(row.apply.textContent),
              textContent: row.apply.textContent,
              answer: this.joinStructuredContent(row.apply.answerContent),
              answerContent: row.apply.answerContent,
              difficulty: this.toDifficultyRank(row.apply.difficulty),
              companyId,
              topicIds,
            },
            tx,
          );
          continue;
        }

        await this.questionsRepository.create(
          {
            text: this.joinStructuredContent(row.apply.textContent),
            textContent: row.apply.textContent,
            answer: this.joinStructuredContent(row.apply.answerContent),
            answerContent: row.apply.answerContent,
            difficulty: this.toDifficultyRank(row.apply.difficulty),
            companyId,
            topicIds,
          },
          tx,
        );
      }
    });

    return {
      ...prepared.report,
      applied: true,
    };
  }

  private async prepareImport(
    file: UploadedCsvFile,
    validatePendingRequests: boolean,
  ): Promise<PreparedImport> {
    this.ensureFile(file);

    const decoded = file.buffer.toString('utf-8');
    const parsed = this.parseCsv(decoded);
    const [headerRow, ...dataRows] = parsed.rows;

    if (!headerRow) {
      throw new BadRequestException('CSV file is empty');
    }

    const {
      fieldIndexes,
      warnings: headerWarnings,
    } = this.resolveHeaders(headerRow);
    const ids = new Set<string>();
    const duplicateIds = new Set<string>();
    const topicSlugs = new Set<string>();
    const companyNames = new Set<string>();

    for (const row of dataRows) {
      const id = this.readCsvValue(row, fieldIndexes.id);

      if (id) {
        if (ids.has(id)) {
          duplicateIds.add(id);
        }
        ids.add(id);
      }

      for (const topicName of this.splitTopics(this.readCsvValue(row, fieldIndexes.topics))) {
        try {
          topicSlugs.add(buildTopicSlug(normalizeTopicName(topicName)));
        } catch {}
      }

      const companyValue = this.normalizeNullableCompany(
        this.readCsvValue(row, fieldIndexes.company),
      );

      if (companyValue) {
        companyNames.add(companyValue);
      }
    }

    const [existingQuestions, existingTopics, existingCompanies] = await Promise.all([
      this.questionsRepository.findByIds(Array.from(ids)),
      this.topicsRepository.findBySlugs(Array.from(topicSlugs)),
      this.companiesRepository.findByNamesInsensitive(Array.from(companyNames)),
    ]);

    const questionsById = new Map(existingQuestions.map((question) => [question.id, question]));
    const topicsBySlug = new Map(existingTopics.map((topic) => [topic.slug, topic]));
    const companiesByKey = new Map(
      existingCompanies.map((company) => [
        company.name.trim().toLocaleLowerCase('ru-RU'),
        company,
      ]),
    );

    const pendingQuestionIds = new Set<string>();

    if (validatePendingRequests && ids.size > 0) {
      for (const questionId of ids) {
        if (
          questionsById.has(questionId) &&
          (await this.questionChangeRequestsRepository.hasPendingRequestForQuestion(
            questionId,
          ))
        ) {
          pendingQuestionIds.add(questionId);
        }
      }
    }

    const importTopics = new Map<string, { name: string; slug: string }>();
    const importCompanies = new Map<string, { key: string; name: string }>();
    const rowPlans: CsvRowPlan[] = dataRows.map((row, index) =>
      this.prepareRow({
        duplicateIds,
        fieldIndexes,
        importCompanies,
        importTopics,
        pendingQuestionIds,
        questionsById,
        row,
        rowNumber: index + 2,
        topicsBySlug,
        companiesByKey,
      }),
    );

    const report: QuestionCsvImportReportDto = {
      applied: false,
      fileName: file.originalname || 'questions.csv',
      delimiter: parsed.delimiter,
      warnings: headerWarnings,
      topicsToCreate: Array.from(importTopics.values())
        .map((topic) => topic.name)
        .sort((left, right) => left.localeCompare(right, 'ru-RU')),
      companiesToCreate: Array.from(importCompanies.values())
        .map((company) => company.name)
        .sort((left, right) => left.localeCompare(right, 'ru-RU')),
      totals: {
        totalRows: rowPlans.length,
        create: rowPlans.filter((row) => row.summary === 'create').length,
        update: rowPlans.filter((row) => row.summary === 'update').length,
        noChange: rowPlans.filter((row) => row.summary === 'no_change').length,
        error: rowPlans.filter((row) => row.summary === 'error').length,
        warning:
          headerWarnings.length +
          rowPlans.reduce((total, row) => total + row.warnings.length, 0),
      },
      rows: rowPlans.map((row) => ({
        rowNumber: row.rowNumber,
        summary: row.summary,
        errors: row.errors,
        warnings: row.warnings,
        normalized: row.normalized,
      })),
    };

    return {
      report,
      rowPlans,
      topicsToCreate: Array.from(importTopics.values()).sort((left, right) =>
        left.slug.localeCompare(right.slug, 'ru-RU'),
      ),
      companiesToCreate: Array.from(importCompanies.values()).sort((left, right) =>
        left.key.localeCompare(right.key, 'ru-RU'),
      ),
    };
  }

  private prepareRow(input: {
    rowNumber: number;
    row: string[];
    fieldIndexes: Partial<Record<CsvFieldKey, number>>;
    duplicateIds: Set<string>;
    questionsById: Map<string, QuestionOutput>;
    topicsBySlug: Map<string, { id: string; name: string; slug: string }>;
    companiesByKey: Map<string, { id: string; name: string }>;
    importTopics: Map<string, { name: string; slug: string }>;
    importCompanies: Map<string, { key: string; name: string }>;
    pendingQuestionIds: Set<string>;
  }): CsvRowPlan {
    const errors: string[] = [];
    const warnings: string[] = [];
    const id = this.readCsvValue(input.row, input.fieldIndexes.id) || null;
    const topicsValue = this.readCsvValue(input.row, input.fieldIndexes.topics);
    const questionText = this.readCsvValue(input.row, input.fieldIndexes.questionText);
    const questionCode = this.readCsvValue(input.row, input.fieldIndexes.questionCode);
    const questionCodeLanguage = this.readCsvValue(
      input.row,
      input.fieldIndexes.questionCodeLanguage,
    );
    const answerText = this.readCsvValue(input.row, input.fieldIndexes.answerText);
    const answerCode = this.readCsvValue(input.row, input.fieldIndexes.answerCode);
    const answerCodeLanguage = this.readCsvValue(
      input.row,
      input.fieldIndexes.answerCodeLanguage,
    );
    const difficultyValue = this.readCsvValue(input.row, input.fieldIndexes.difficulty);
    const companyValue = this.normalizeNullableCompany(
      this.readCsvValue(input.row, input.fieldIndexes.company),
    );

    if (input.fieldIndexes.topics === undefined) {
      errors.push("Отсутствует колонка 'Темы'.");
    }

    if (input.fieldIndexes.questionText === undefined) {
      errors.push("Отсутствует колонка 'Вопрос.Текст'.");
    }

    if (input.fieldIndexes.answerText === undefined) {
      errors.push("Отсутствует колонка 'Ответ.Текст'.");
    }

    if (input.fieldIndexes.difficulty === undefined) {
      errors.push("Отсутствует колонка 'Сложность'.");
    }

    if (id && input.duplicateIds.has(id)) {
      errors.push(`ID '${id}' дублируется в файле.`);
    }

    const normalizedTopics: Array<{ name: string; slug: string }> = [];

    for (const topicName of this.splitTopics(topicsValue)) {
      try {
        const normalizedName = normalizeTopicName(topicName);
        const slug = buildTopicSlug(normalizedName);
        const existingTopic = input.topicsBySlug.get(slug);
        const pendingTopic = input.importTopics.get(slug);

        if (!existingTopic && !pendingTopic) {
          input.importTopics.set(slug, {
            name: normalizedName,
            slug,
          });
        } else if (
          pendingTopic &&
          pendingTopic.name.toLocaleLowerCase('ru-RU') !==
            normalizedName.toLocaleLowerCase('ru-RU')
        ) {
          warnings.push(
            `Тема '${normalizedName}' нормализована к новой теме '${pendingTopic.name}'.`,
          );
        }

        normalizedTopics.push({
          name: existingTopic?.name ?? pendingTopic?.name ?? normalizedName,
          slug,
        });
      } catch (error) {
        errors.push(this.toErrorMessage(error, 'Тема некорректна.'));
      }
    }

    if (normalizedTopics.length === 0) {
      errors.push('Нужно указать хотя бы одну тему.');
    }

    const normalizedDifficulty = this.parseDifficulty(difficultyValue);

    if (!normalizedDifficulty) {
      errors.push("Сложность должна быть одной из: junior, middle, senior, lead, 1, 2, 3, 4.");
    }

    const questionContent = this.normalizeImportStructuredContent(
      {
        text: questionText,
        code: questionCode,
        codeLanguage: questionCodeLanguage,
      },
      'Текст вопроса',
      QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
      errors,
    );
    const answerContent = this.normalizeImportStructuredContent(
      {
        text: answerText,
        code: answerCode,
        codeLanguage: answerCodeLanguage,
      },
      'Ответ',
      QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
      errors,
    );

    let companyKey: string | null = null;

    if (companyValue) {
      companyKey = companyValue.trim().toLocaleLowerCase('ru-RU');
      const existingCompany = input.companiesByKey.get(companyKey);
      const pendingCompany = input.importCompanies.get(companyKey);

      if (!existingCompany && !pendingCompany) {
        input.importCompanies.set(companyKey, {
          key: companyKey,
          name: companyValue,
        });
      } else if (
        pendingCompany &&
        pendingCompany.name.toLocaleLowerCase('ru-RU') !==
          companyValue.toLocaleLowerCase('ru-RU')
      ) {
        warnings.push(
          `Компания '${companyValue}' нормализована к новой компании '${pendingCompany.name}'.`,
        );
      }
    }

    const existingQuestion = id ? input.questionsById.get(id) ?? null : null;

    if (id && !existingQuestion) {
      errors.push(`Вопрос с ID '${id}' не найден.`);
    }

    if (id && input.pendingQuestionIds.has(id)) {
      errors.push(`Вопрос с ID '${id}' имеет pending change request.`);
    }

    const normalized = {
      id,
      topics: normalizedTopics.map((topic) => topic.name),
      questionText: questionContent
        ? getQuestionStructuredContentText(questionContent)
        : questionText,
      questionCode: questionContent
        ? getQuestionStructuredContentCode(questionContent) || null
        : questionCode || null,
      questionCodeLanguage: questionContent
        ? getQuestionStructuredContentCodeLanguage(questionContent)
        : this.normalizeNullableCodeLanguage(questionCodeLanguage),
      answerText: answerContent
        ? getQuestionStructuredContentText(answerContent)
        : answerText,
      answerCode: answerContent
        ? getQuestionStructuredContentCode(answerContent) || null
        : answerCode || null,
      answerCodeLanguage: answerContent
        ? getQuestionStructuredContentCodeLanguage(answerContent)
        : this.normalizeNullableCodeLanguage(answerCodeLanguage),
      difficulty: normalizedDifficulty,
      company:
        companyKey && input.companiesByKey.has(companyKey)
          ? input.companiesByKey.get(companyKey)?.name ?? companyValue
          : companyValue,
    };

    if (errors.length > 0 || !normalizedDifficulty || !questionContent || !answerContent) {
      return {
        rowNumber: input.rowNumber,
        summary: 'error',
        errors,
        warnings,
        normalized,
        apply: null,
      };
    }

    const comparableImported: ComparableQuestion = {
      textContent: questionContent,
      answerContent: answerContent,
      difficulty: normalizedDifficulty,
      companyName:
        companyKey && input.companiesByKey.has(companyKey)
          ? input.companiesByKey.get(companyKey)?.name ?? companyValue
          : companyValue,
      topicSlugs: normalizedTopics.map((topic) => topic.slug),
    };

    const summary: QuestionCsvImportRowSummary =
      existingQuestion === null
        ? 'create'
        : this.areQuestionsEqual(
              comparableImported,
              this.toComparableExistingQuestion(existingQuestion),
            )
          ? 'no_change'
          : 'update';

    return {
      rowNumber: input.rowNumber,
      summary,
      errors,
      warnings,
      normalized,
      apply: {
        id,
        textContent: questionContent,
        answerContent: answerContent,
        difficulty: normalizedDifficulty,
        companyName: comparableImported.companyName,
        companyKey,
        topicSlugs: comparableImported.topicSlugs,
      },
    };
  }

  private normalizeImportStructuredContent(
    value: {
      text: string;
      code: string;
      codeLanguage: string;
    },
    fieldLabel: string,
    plainTextLimit: number,
    errors: string[],
  ) {
    try {
      const blocks = this.parseStructuredContentFromCsvFields(value);

      return normalizeQuestionStructuredContent(
        blocks,
        {
          fieldLabel,
          plainTextLimit,
        },
      );
    } catch (error) {
      errors.push(this.toErrorMessage(error, `${fieldLabel} некорректен.`));
      return null;
    }
  }

  private areQuestionsEqual(left: ComparableQuestion, right: ComparableQuestion) {
    return JSON.stringify(this.canonicalizeComparableQuestion(left)) ===
      JSON.stringify(this.canonicalizeComparableQuestion(right));
  }

  private canonicalizeComparableQuestion(value: ComparableQuestion) {
    return {
      textContent: canonicalizeQuestionStructuredContent(value.textContent),
      answerContent: canonicalizeQuestionStructuredContent(value.answerContent),
      difficulty: value.difficulty,
      companyName: value.companyName?.trim().toLocaleLowerCase('ru-RU') ?? null,
      topicSlugs: [...value.topicSlugs].sort((left, right) =>
        left.localeCompare(right, 'ru-RU'),
      ),
    };
  }

  private toComparableExistingQuestion(question: QuestionOutput): ComparableQuestion {
    return {
      textContent: question.textContent,
      answerContent: question.answerContent,
      difficulty: this.fromDifficultyRank(question.difficulty),
      companyName: question.company?.name ?? null,
      topicSlugs: question.topics.map((topic) => topic.slug),
    };
  }

  private async loadQuestionsForExport(query: ExportQuestionsCsvQueryDto) {
    const items: Awaited<ReturnType<SearchRepository['searchQuestions']>>['items'] = [];
    let offset = 0;
    let total = 0;

    do {
      const batch = await this.searchRepository.searchQuestions({
        ...query,
        limit: EXPORT_BATCH_SIZE,
        offset,
        sort: query.sort ?? SearchSort.RELEVANCE,
      });

      items.push(...batch.items);
      total = batch.total;
      offset += EXPORT_BATCH_SIZE;
    } while (offset < total);

    return items;
  }

  private buildExportFileName() {
    const now = new Date();
    const datePart = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('-');
    const timePart = [
      String(now.getUTCHours()).padStart(2, '0'),
      String(now.getUTCMinutes()).padStart(2, '0'),
      String(now.getUTCSeconds()).padStart(2, '0'),
    ].join('-');

    return `question-bank-${datePart}-${timePart}.csv`;
  }

  private resolveHeaders(headers: string[]) {
    const warnings: string[] = [];
    const fieldIndexes: Partial<Record<CsvFieldKey, number>> = {};

    headers.forEach((header, index) => {
      const cleanedHeader = this.normalizeHeader(header);
      const mappedField =
        CANONICAL_HEADERS[cleanedHeader] ?? LEGACY_HEADERS[cleanedHeader] ?? null;

      if (mappedField) {
        if (fieldIndexes[mappedField] !== undefined) {
          warnings.push(
            `Колонка '${cleanedHeader}' дублирует поле импорта и будет проигнорирована.`,
          );
          return;
        }

        fieldIndexes[mappedField] = index;
        return;
      }

      if (IGNORED_HEADERS.has(cleanedHeader)) {
        warnings.push(`Колонка '${cleanedHeader}' будет проигнорирована.`);
        return;
      }

      if (cleanedHeader) {
        warnings.push(`Неизвестная колонка '${cleanedHeader}' будет проигнорирована.`);
      }
    });

    return {
      fieldIndexes,
      warnings,
    };
  }

  private parseCsv(value: string): ParsedCsv {
    const source = value.replace(/^\uFEFF/, '');
    const delimiter = this.detectDelimiter(source);
    const rows: string[][] = [];
    let field = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let index = 0; index < source.length; index += 1) {
      const current = source[index];
      const next = source[index + 1];

      if (current === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && current === delimiter) {
        row.push(field);
        field = '';
        continue;
      }

      if (!inQuotes && (current === '\n' || current === '\r')) {
        row.push(field);
        field = '';

        if (row.some((cell) => cell.length > 0)) {
          rows.push(row);
        }

        row = [];

        if (current === '\r' && next === '\n') {
          index += 1;
        }
        continue;
      }

      field += current;
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
    }

    return {
      delimiter,
      rows,
    };
  }

  private detectDelimiter(value: string): CsvDelimiter {
    const header = value.split(/\r\n|\n|\r/, 1)[0] ?? '';
    const semicolonCount = (header.match(/;/g) ?? []).length;
    const commaCount = (header.match(/,/g) ?? []).length;

    return semicolonCount >= commaCount ? ';' : ',';
  }

  private readCsvValue(row: string[], index: number | undefined) {
    if (index === undefined) {
      return '';
    }

    return (row[index] ?? '').trim();
  }

  private splitTopics(value: string) {
    return value
      .split('|')
      .map((topic) => topic.trim())
      .filter(Boolean)
      .filter((topic, index, topics) => topics.indexOf(topic) === index);
  }

  private parseDifficulty(value: string): QuestionDifficulty | null {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    if (
      normalized === QuestionDifficulty.JUNIOR ||
      normalized === QuestionDifficulty.MIDDLE ||
      normalized === QuestionDifficulty.SENIOR ||
      normalized === QuestionDifficulty.LEAD
    ) {
      return normalized;
    }

    if (/^1(?:\.0+)?$/.test(normalized)) {
      return QuestionDifficulty.JUNIOR;
    }

    if (/^2(?:\.0+)?$/.test(normalized)) {
      return QuestionDifficulty.MIDDLE;
    }

    if (/^3(?:\.0+)?$/.test(normalized)) {
      return QuestionDifficulty.SENIOR;
    }

    if (/^4(?:\.0+)?$/.test(normalized)) {
      return QuestionDifficulty.LEAD;
    }

    return null;
  }

  private normalizeNullableCompany(value: string) {
    if (!value.trim()) {
      return null;
    }

    const normalized = normalizeCompanyName(value);
    return normalized || null;
  }

  private normalizeNullableCodeLanguage(value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    return QUESTION_CODE_LANGUAGES.includes(normalized as QuestionCodeLanguage)
      ? (normalized as QuestionCodeLanguage)
      : null;
  }

  private escapeCsvCell(value: string | null | undefined, delimiter: CsvDelimiter) {
    const normalized = String(value ?? '').replace(/\r\n?/g, '\n');

    if (
      normalized.includes('"') ||
      normalized.includes('\n') ||
      normalized.includes('\r') ||
      normalized.includes(delimiter)
    ) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
  }

  private ensureFile(file: UploadedCsvFile | undefined | null): asserts file is UploadedCsvFile {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('CSV file is required');
    }
  }

  private normalizeHeader(value: string) {
    return value.replace(/^\uFEFF/, '').trim();
  }

  private toErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return fallback;
  }

  private parseStructuredContentFromCsvFields(value: {
    text: string;
    code: string;
    codeLanguage: string;
  }) {
    const blocks: QuestionStructuredContent = [
      ...this.parseStructuredContentFromText(value.text),
      ...this.buildExplicitCodeBlocks(value.code, value.codeLanguage),
    ];

    return this.compactStructuredContentBlocks(blocks);
  }

  private parseStructuredContentFromText(value: string) {
    const normalized = this.normalizeMultiline(value);

    if (!normalized.trim()) {
      return [] satisfies QuestionStructuredContent;
    }

    if (normalized.includes('```')) {
      return this.parseMarkdownStructuredContent(normalized);
    }

    return this.parseHeuristicStructuredContent(normalized);
  }

  private parseMarkdownStructuredContent(value: string) {
    const blocks: QuestionStructuredContent = [];
    const fencePattern = /```([^\n`]*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let hasFence = false;

    for (const match of value.matchAll(fencePattern)) {
      hasFence = true;
      const matchStart = match.index ?? 0;
      const rawText = value.slice(lastIndex, matchStart);

      blocks.push(...this.parseHeuristicStructuredContent(rawText));

      const code = this.trimCodeBlock(match[2] ?? '');

      if (code) {
        const language = this.normalizeNullableCodeLanguage(match[1] ?? '');
        blocks.push({
          kind: 'code',
          content: code,
          ...(language ? { language } : {}),
        });
      }

      lastIndex = matchStart + match[0].length;
    }

    if (!hasFence) {
      return this.parseHeuristicStructuredContent(value);
    }

    const trailingText = value.slice(lastIndex);
    blocks.push(...this.parseHeuristicStructuredContent(trailingText));

    return this.compactStructuredContentBlocks(blocks);
  }

  private parseHeuristicStructuredContent(value: string) {
    const normalized = this.normalizeMultiline(value);

    if (!normalized.trim()) {
      return [] satisfies QuestionStructuredContent;
    }

    const lines = normalized.split('\n');
    const blocks: QuestionStructuredContent = [];
    const textBuffer: string[] = [];

    const flushText = () => {
      const text = textBuffer.join('\n').trim();

      if (text) {
        blocks.push({
          kind: 'text',
          content: text,
        });
      }

      textBuffer.length = 0;
    };

    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const inlineCodeStart = this.splitInlineCodeStart(
        lines[lineIndex] ?? '',
        lines[lineIndex + 1] ?? '',
      );

      if (inlineCodeStart) {
        if (inlineCodeStart.text.trim()) {
          textBuffer.push(inlineCodeStart.text.trimEnd());
        }

        lines[lineIndex] = inlineCodeStart.code;
      }

      const codeRangeEnd = this.detectCodeBlockEnd(lines, lineIndex);

      if (codeRangeEnd === null) {
        textBuffer.push(lines[lineIndex] ?? '');
        lineIndex += 1;
        continue;
      }

      flushText();

      const code = this.trimCodeBlock(lines.slice(lineIndex, codeRangeEnd).join('\n'));

      if (code) {
        const language = this.inferCodeLanguage(code);
        blocks.push({
          kind: 'code',
          content: code,
          ...(language ? { language } : {}),
        });
      }

      lineIndex = codeRangeEnd;
    }

    flushText();

    return this.compactStructuredContentBlocks(blocks);
  }

  private buildExplicitCodeBlocks(
    code: string,
    codeLanguage: string,
  ) {
    const normalizedCode = this.normalizeMultiline(code);

    if (!normalizedCode.trim()) {
      return [] satisfies QuestionStructuredContent;
    }

    const language =
      this.normalizeNullableCodeLanguage(codeLanguage) ??
      this.inferCodeLanguage(normalizedCode);

    return [
      {
        kind: 'code' as const,
        content: this.trimCodeBlock(normalizedCode),
        ...(language ? { language } : {}),
      },
    ] satisfies QuestionStructuredContent;
  }

  private detectCodeBlockEnd(lines: string[], startIndex: number) {
    const startScore = this.scoreCodeLine(lines[startIndex] ?? '');

    if (startScore < 3) {
      return null;
    }

    let endIndex = startIndex + 1;

    while (endIndex < lines.length) {
      const line = lines[endIndex] ?? '';
      const trimmed = line.trim();

      if (!trimmed) {
        const nextNonEmptyIndex = this.findNextNonEmptyLine(lines, endIndex + 1);

        if (nextNonEmptyIndex === null) {
          break;
        }

        if (this.scoreCodeLine(lines[nextNonEmptyIndex] ?? '') < 1) {
          break;
        }

        endIndex += 1;
        continue;
      }

      if (this.scoreCodeLine(line) < 1) {
        break;
      }

      endIndex += 1;
    }

    if (endIndex === startIndex + 1 && startScore < 4) {
      return null;
    }

    return endIndex;
  }

  private findNextNonEmptyLine(lines: string[], startIndex: number) {
    for (let index = startIndex; index < lines.length; index += 1) {
      if ((lines[index] ?? '').trim()) {
        return index;
      }
    }

    return null;
  }

  private scoreCodeLine(line: string) {
    const normalized = this.normalizeMultiline(line);
    const trimmed = normalized.trim();

    if (!trimmed) {
      return 0;
    }

    const hasCyrillic = /[А-Яа-яЁё]/.test(trimmed);
    const isHtmlLine = /^<\/?[A-Za-z][\w:-]*(\s|>|\/>)/.test(trimmed);
    const startsWithCodeKeyword =
      /^(const|let|var|function|class|interface|type|enum|import|export|return|if\b|else\b|for\b|while\b|switch\b|case\b|try\b|catch\b|finally\b|throw\b|new\b|await\b)/.test(
        trimmed,
      );
    const hasStrongCodeToken =
      /=>|===|!==|\bconsole\.|\baddEventListener\(|\bsetTimeout\(|\bsetInterval\(|\bqueueMicrotask\(/.test(
        trimmed,
      );
    const isCommentLine = /^\s*(\/\/|\/\*|\*\/|<!--)/.test(trimmed);
    let score = 0;

    if (isHtmlLine) {
      score += 4;
    }

    if (startsWithCodeKeyword) {
      score += 3;
    }

    if (hasStrongCodeToken) {
      score += 3;
    }

    if (/^\s*[A-Za-z_$][\w$]*\??:\s*[\w<>{}\[\]|'", ]+,?$/.test(trimmed)) {
      score += 2;
    }

    if (/^\s*[@:#.A-Za-z][^{]*\{\s*$/.test(trimmed) && !hasCyrillic) {
      score += 3;
    }

    if (/^\s*[A-Za-z-]+\s*:\s*[^;]+;?$/.test(trimmed) && !hasCyrillic) {
      score += 2;
    }

    if (/^[)\]}>,;]+$/.test(trimmed)) {
      score += 1;
    }

    if (/[{};]/.test(trimmed)) {
      score += 1;
    }

    if (isCommentLine) {
      score += 2;
    }

    if (!hasCyrillic && /[<>{}()[\];:=]/.test(trimmed)) {
      score += 1;
    }

    if (
      hasCyrillic &&
      !isHtmlLine &&
      !startsWithCodeKeyword &&
      !hasStrongCodeToken &&
      !isCommentLine
    ) {
      score = Math.min(score, 0);
    }

    return score;
  }

  private inferCodeLanguage(code: string) {
    const normalized = this.normalizeMultiline(code).trim();

    if (!normalized) {
      return null;
    }

    if (/<template\b|<script\b|<style\b|v-for=|v-if=|@click\b|:\w+=/i.test(normalized)) {
      return 'vue' satisfies QuestionCodeLanguage;
    }

    if (/^<\/?[A-Za-z][\w:-]*(\s|>|\/>)/m.test(normalized)) {
      return 'html' satisfies QuestionCodeLanguage;
    }

    if (
      /\binterface\b|\btype\b|:\s*[A-Z][\w<>{}\[\]|]+|\bas const\b|^\s*[A-Za-z_$][\w$]*\??:\s*[\w<>{}\[\]|'", ]+,?$/m.test(
        normalized,
      )
    ) {
      return 'typescript' satisfies QuestionCodeLanguage;
    }

    if (/<[A-Za-z][^>]*>/.test(normalized)) {
      return 'jsx' satisfies QuestionCodeLanguage;
    }

    if (/\bimport\b|\bconst\b|\blet\b|\bfunction\b|=>|\bconsole\./.test(normalized)) {
      return 'javascript' satisfies QuestionCodeLanguage;
    }

    if (
      /^[\s\S]*\{[\s\S]*:[^;]+;[\s\S]*\}$/m.test(normalized) ||
      /^\s*[A-Za-z-]+\s*:\s*[^;]+;?$/m.test(normalized)
    ) {
      return 'css' satisfies QuestionCodeLanguage;
    }

    return null;
  }

  private splitInlineCodeStart(
    line: string,
    nextLine: string,
  ): { text: string; code: string } | null {
    const normalized = this.normalizeMultiline(line);
    const nextNormalized = this.normalizeMultiline(nextLine);
    const codeStartPatterns = [
      /\b(type|interface|const|let|var|function|class|import|export)\b/,
      /<\/?[A-Za-z][\w:-]*(\s|>|\/>)/,
    ];

    for (const pattern of codeStartPatterns) {
      const match = pattern.exec(normalized);

      if (!match || match.index === undefined || match.index <= 0) {
        continue;
      }

      const before = normalized.slice(0, match.index);
      const after = normalized.slice(match.index);

      if (
        !/[А-Яа-яЁё]/.test(before) &&
        !/:\s*$/.test(before)
      ) {
        continue;
      }

      if (
        this.scoreCodeLine(after) < 3 &&
        this.scoreCodeLine(nextNormalized) < 1
      ) {
        continue;
      }

      return {
        text: before,
        code: after,
      };
    }

    return null;
  }

  private trimCodeBlock(value: string) {
    return this.normalizeMultiline(value).replace(/^\n+|\n+$/g, '');
  }

  private compactStructuredContentBlocks(value: QuestionStructuredContent) {
    const compact: QuestionStructuredContent = [];

    for (const block of value) {
      const content =
        block.kind === 'code'
          ? this.trimCodeBlock(block.content)
          : this.normalizeMultiline(block.content).trim();

      if (!content) {
        continue;
      }

      const previous = compact.at(-1);

      if (
        previous &&
        previous.kind === block.kind &&
        (
          block.kind === 'text' ||
          (previous.kind === 'code' &&
            (previous.language === block.language ||
              !previous.language ||
              !block.language))
        )
      ) {
        if (block.kind === 'text') {
          previous.content = `${previous.content}\n\n${content}`;
        } else if (previous.kind === 'code') {
          previous.content = `${previous.content}\n\n${content}`;
          previous.language = previous.language ?? block.language;
        }
        continue;
      }

      compact.push(
        block.kind === 'text'
          ? {
              kind: 'text',
              content,
            }
          : {
              kind: 'code',
              content,
              ...(block.language ? { language: block.language } : {}),
            },
      );
    }

    return compact;
  }

  private renderStructuredContentForCsvText(value: QuestionStructuredContent) {
    return value
      .map((block) =>
        block.kind === 'text'
          ? block.content
          : [
              `\`\`\`${block.language ?? ''}`.trimEnd(),
              block.content,
              '```',
            ].join('\n'),
      )
      .join('\n\n');
  }

  private normalizeMultiline(value: string) {
    return value.replace(/\r\n?/g, '\n');
  }

  private joinStructuredContent(value: QuestionStructuredContent) {
    return joinQuestionStructuredContent(value);
  }

  private toDifficultyRank(value: QuestionDifficulty) {
    if (value === QuestionDifficulty.JUNIOR) {
      return 1;
    }

    if (value === QuestionDifficulty.MIDDLE) {
      return 2;
    }

    if (value === QuestionDifficulty.SENIOR) {
      return 3;
    }

    return 4;
  }

  private fromDifficultyRank(value: number): QuestionDifficulty {
    if (value === 1) {
      return QuestionDifficulty.JUNIOR;
    }

    if (value === 2) {
      return QuestionDifficulty.MIDDLE;
    }

    if (value === 3) {
      return QuestionDifficulty.SENIOR;
    }

    return QuestionDifficulty.LEAD;
  }
}
