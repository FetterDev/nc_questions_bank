import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  QuestionStructuredContent,
  coerceQuestionStructuredContent,
} from '../questions/question-structured-content';
import {
  fromDifficultyRank,
  QuestionDifficulty,
  toDifficultyRank,
} from '../questions/question-difficulty';
import { SearchQuestionsQueryDto, SearchSort } from './dto/search-questions.query.dto';

type SearchQuestionRow = {
  id: string;
  text: string;
  textContent: unknown;
  answer: string;
  answerContent: unknown;
  difficulty: number;
  company: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  rank: number;
  topics: Array<{ id: string; name: string; slug: string }>;
};

type SearchQuestionOutput = Omit<
  SearchQuestionRow,
  'difficulty' | 'textContent' | 'answerContent'
> & {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
};

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchQuestions(query: SearchQuestionsQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const normalizedQ = query.q?.trim() || null;
    const normalizedCompanyQuery = query.companyQuery?.trim() || null;
    const difficultyRanks = query.difficulty?.map(toDifficultyRank);

    const whereConditions: Prisma.Sql[] = [];

    if (normalizedQ) {
      whereConditions.push(Prisma.sql`
        (
          to_tsvector('simple', coalesce(q.text, '') || ' ' || coalesce(q.answer, '')) @@ websearch_to_tsquery('simple', ${normalizedQ})
          OR q.text ILIKE ${`%${normalizedQ}%`}
          OR q.answer ILIKE ${`%${normalizedQ}%`}
        )
      `);
    }

    if (difficultyRanks && difficultyRanks.length > 0) {
      whereConditions.push(
        Prisma.sql`q.difficulty IN (${Prisma.join(difficultyRanks)})`,
      );
    }

    if (query.topicIds && query.topicIds.length > 0) {
      whereConditions.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM question_topics qt_filter
          WHERE qt_filter."questionId" = q.id
            AND qt_filter."topicId" IN (${Prisma.join(query.topicIds)})
        )
      `);
    }

    if (normalizedCompanyQuery) {
      whereConditions.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM companies c_filter
          WHERE c_filter.id = q."companyId"
            AND c_filter.name ILIKE ${`%${normalizedCompanyQuery}%`}
        )
      `);
    }

    const whereSql =
      whereConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
        : Prisma.empty;

    const rankExpr = normalizedQ
      ? Prisma.sql`ts_rank_cd(to_tsvector('simple', coalesce(q.text, '') || ' ' || coalesce(q.answer, '')), websearch_to_tsquery('simple', ${normalizedQ}))`
      : Prisma.sql`0::real`;

    const filteredOrder = this.getFilteredOrder(query.sort);
    const outputOrder = this.getOutputOrder(query.sort);

    const rows = await this.prisma.$queryRaw<SearchQuestionRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          q.id,
          q.text,
          q."textContent",
          q.answer,
          q."answerContent",
          q.difficulty,
          q."companyId",
          q."createdAt",
          q."updatedAt",
          ${rankExpr} AS rank
        FROM questions q
        ${whereSql}
      ),
      paged AS (
        SELECT *
        FROM filtered
        ORDER BY ${filteredOrder}
        LIMIT ${limit}
        OFFSET ${offset}
      )
      SELECT
        p.id,
        p.text,
        p."textContent",
        p.answer,
        p."answerContent",
        p.difficulty,
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE jsonb_build_object('id', c.id, 'name', c.name)
        END AS company,
        p."createdAt",
        p."updatedAt",
        p.rank,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::jsonb
        ) AS topics
      FROM paged p
      LEFT JOIN companies c ON c.id = p."companyId"
      LEFT JOIN question_topics qt ON qt."questionId" = p.id
      LEFT JOIN topics t ON t.id = qt."topicId"
      GROUP BY
        p.id,
        p.text,
        p."textContent",
        p.answer,
        p."answerContent",
        p.difficulty,
        c.id,
        c.name,
        p."createdAt",
        p."updatedAt",
        p.rank
      ORDER BY ${outputOrder}
    `);

    const totalRows = await this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM questions q
      ${whereSql}
    `);

    return {
      items: rows.map((row): SearchQuestionOutput => ({
        ...row,
        textContent:
          coerceQuestionStructuredContent(row.textContent, row.text) ?? [
            { kind: 'text', content: row.text },
          ],
        answerContent:
          coerceQuestionStructuredContent(row.answerContent, row.answer) ?? [
            { kind: 'text', content: row.answer },
          ],
        difficulty: fromDifficultyRank(row.difficulty),
      })),
      total: totalRows[0]?.total ?? 0,
    };
  }

  private getFilteredOrder(sort: SearchSort | undefined): Prisma.Sql {
    if (sort === SearchSort.NEWEST || sort === SearchSort.POPULAR) {
      return Prisma.sql`"createdAt" DESC, id DESC`;
    }

    return Prisma.sql`rank DESC, "createdAt" DESC, id DESC`;
  }

  private getOutputOrder(sort: SearchSort | undefined): Prisma.Sql {
    if (sort === SearchSort.NEWEST || sort === SearchSort.POPULAR) {
      return Prisma.sql`p."createdAt" DESC, p.id DESC`;
    }

    return Prisma.sql`p.rank DESC, p."createdAt" DESC, p.id DESC`;
  }
}
