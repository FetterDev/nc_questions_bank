import { Injectable } from '@nestjs/common';
import { Prisma, TrainingSessionResultMark } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QuestionStructuredContent } from '../questions/question-structured-content';

type BankDifficultyCountRow = {
  difficulty: number;
  count: number;
};

type BankTopicCountRow = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type GrowthSummaryRow = {
  totalResults: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
};

type GrowthFeedbackRow = {
  sessionId: string;
  finishedAt: Date;
  feedback: string;
  trainerId: string | null;
  trainerDisplayName: string | null;
  trainerLogin: string | null;
};

type GrowthTopicRow = {
  topicId: string;
  name: string;
  slug: string;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
};

type GrowthQuestionRow = {
  questionId: string;
  text: string;
  textContent: QuestionStructuredContent;
  difficulty: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  lastResult: TrainingSessionResultMark;
  lastAnsweredAt: Date;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getBankQuestionsCount() {
    return this.prisma.question.count();
  }

  getBankDifficultyCounts() {
    return this.prisma.$queryRaw<BankDifficultyCountRow[]>(Prisma.sql`
      SELECT
        q.difficulty,
        COUNT(*)::int AS count
      FROM questions q
      GROUP BY q.difficulty
      ORDER BY q.difficulty ASC
    `);
  }

  getBankTopicCounts() {
    return this.prisma.$queryRaw<BankTopicCountRow[]>(Prisma.sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        COUNT(qt."questionId")::int AS count
      FROM topics t
      INNER JOIN question_topics qt ON qt."topicId" = t.id
      GROUP BY t.id, t.name, t.slug
      ORDER BY count DESC, t.name ASC, t.id DESC
    `);
  }

  async getGrowthSummary(userId: string) {
    const [row] = await this.prisma.$queryRaw<GrowthSummaryRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalResults",
        COUNT(*) FILTER (WHERE r.result = 'CORRECT')::int AS "correctCount",
        COUNT(*) FILTER (WHERE r.result = 'INCORRECT')::int AS "incorrectCount",
        COUNT(*) FILTER (WHERE r.result = 'PARTIAL')::int AS "partialCount"
      FROM training_session_results r
      INNER JOIN training_sessions s ON s.id = r."sessionId"
      WHERE s."userId" = ${userId}
    `);

    return (
      row ?? {
        totalResults: 0,
        correctCount: 0,
        incorrectCount: 0,
        partialCount: 0,
      }
    );
  }

  getGrowthFeedbackEntries(userId: string) {
    return this.prisma.$queryRaw<GrowthFeedbackRow[]>(Prisma.sql`
      SELECT
        s.id AS "sessionId",
        s."finishedAt",
        s.feedback,
        trainer.id AS "trainerId",
        trainer."displayName" AS "trainerDisplayName",
        trainer.login AS "trainerLogin"
      FROM training_sessions s
      LEFT JOIN users trainer ON trainer.id = s."trainerId"
      WHERE
        s."userId" = ${userId}
        AND s.feedback IS NOT NULL
      ORDER BY
        s."finishedAt" DESC,
        s."createdAt" DESC,
        s.id DESC
      LIMIT 5
    `);
  }

  getGrowthTopicStats(userId: string) {
    return this.prisma.$queryRaw<GrowthTopicRow[]>(Prisma.sql`
      WITH user_topic_results AS (
        SELECT
          rt."topicId",
          rt."topicName",
          rt."topicSlug",
          r.result,
          s."finishedAt",
          r."createdAt",
          r.id
        FROM training_session_result_topics rt
        INNER JOIN training_session_results r ON r.id = rt."resultId"
        INNER JOIN training_sessions s ON s.id = r."sessionId"
        WHERE s."userId" = ${userId}
      ),
      aggregated AS (
        SELECT
          utr."topicId",
          COUNT(*) FILTER (WHERE utr.result = 'CORRECT')::int AS "correctCount",
          COUNT(*) FILTER (WHERE utr.result = 'INCORRECT')::int AS "incorrectCount",
          COUNT(*) FILTER (WHERE utr.result = 'PARTIAL')::int AS "partialCount"
        FROM user_topic_results utr
        GROUP BY utr."topicId"
      ),
      latest AS (
        SELECT DISTINCT ON (utr."topicId")
          utr."topicId",
          utr."topicName",
          utr."topicSlug"
        FROM user_topic_results utr
        ORDER BY
          utr."topicId",
          utr."finishedAt" DESC,
          utr."createdAt" DESC,
          utr.id DESC
      )
      SELECT
        aggregated."topicId",
        latest."topicName" AS name,
        latest."topicSlug" AS slug,
        aggregated."correctCount",
        aggregated."incorrectCount",
        aggregated."partialCount"
      FROM aggregated
      INNER JOIN latest ON latest."topicId" = aggregated."topicId"
      ORDER BY
        (aggregated."incorrectCount" + aggregated."partialCount") DESC,
        (
          aggregated."correctCount"::numeric /
          NULLIF(aggregated."correctCount" + aggregated."incorrectCount" + aggregated."partialCount", 0)
        ) ASC NULLS FIRST,
        aggregated."topicId" DESC
    `);
  }

  getGrowthQuestionStats(userId: string) {
    return this.prisma.$queryRaw<GrowthQuestionRow[]>(Prisma.sql`
      WITH user_results AS (
        SELECT
          r.id,
          r."questionId",
          r."questionText",
          r."questionTextContent",
          r.difficulty,
          r.result,
          r."createdAt",
          s."finishedAt"
        FROM training_session_results r
        INNER JOIN training_sessions s ON s.id = r."sessionId"
        WHERE s."userId" = ${userId}
      ),
      aggregated AS (
        SELECT
          ur."questionId",
          COUNT(*) FILTER (WHERE ur.result = 'CORRECT')::int AS "correctCount",
          COUNT(*) FILTER (WHERE ur.result = 'INCORRECT')::int AS "incorrectCount",
          COUNT(*) FILTER (WHERE ur.result = 'PARTIAL')::int AS "partialCount",
          MAX(ur."finishedAt") AS "lastAnsweredAt"
        FROM user_results ur
        GROUP BY ur."questionId"
      ),
      latest AS (
        SELECT
          ranked.id,
          ranked."questionId",
          ranked."questionText",
          ranked."questionTextContent",
          ranked.difficulty,
          ranked.result AS "lastResult"
        FROM (
          SELECT
            ur.*,
            ROW_NUMBER() OVER (
              PARTITION BY ur."questionId"
              ORDER BY
                ur."finishedAt" DESC,
                ur."createdAt" DESC,
                ur.id DESC
            ) AS row_rank
          FROM user_results ur
        ) ranked
        WHERE ranked.row_rank = 1
      )
      SELECT
        aggregated."questionId",
        latest."questionText" AS text,
        latest."questionTextContent" AS "textContent",
        latest.difficulty,
        aggregated."correctCount",
        aggregated."incorrectCount",
        aggregated."partialCount",
        latest."lastResult",
        aggregated."lastAnsweredAt",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', rt."topicId",
              'name', rt."topicName",
              'slug', rt."topicSlug"
            )
          ) FILTER (WHERE rt."topicId" IS NOT NULL),
          '[]'::jsonb
        ) AS topics
      FROM aggregated
      INNER JOIN latest ON latest."questionId" = aggregated."questionId"
      LEFT JOIN training_session_result_topics rt ON rt."resultId" = latest.id
      GROUP BY
        aggregated."questionId",
        latest."questionText",
        latest."questionTextContent",
        latest.difficulty,
        aggregated."correctCount",
        aggregated."incorrectCount",
        aggregated."partialCount",
        latest."lastResult",
        aggregated."lastAnsweredAt"
    `);
  }
}
