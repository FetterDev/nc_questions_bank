import { Injectable } from '@nestjs/common';
import {
  InterviewStatus,
  Prisma,
  TrainingSessionResultMark,
  UserRole,
  UserStatus,
} from '@prisma/client';
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

const teamEmployeeSelect = {
  id: true,
  login: true,
  displayName: true,
  role: true,
  stacks: {
    include: {
      stack: true,
    },
    orderBy: [{ stack: { name: 'asc' } }, { stackId: 'asc' }],
  },
} satisfies Prisma.UserSelect;

export type TeamEmployeeRecord = Prisma.UserGetPayload<{
  select: typeof teamEmployeeSelect;
}>;

export type TeamAnswerSummaryRow = {
  userId: string;
  totalAnswers: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  lastActivityAt: Date | null;
};

export type TeamActivitySummaryRow = {
  userId: string;
  trainingSessionsCount: number;
  completedInterviewsCount: number;
  feedbackCount: number;
  lastActivityAt: Date | null;
};

export type TeamGrowthTopicRow = {
  userId: string;
  topicId: string;
  name: string;
  slug: string;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
};

export type TeamStackLevelRow = {
  userId: string;
  stackId: string;
  stackName: string;
  stackSlug: string;
  totalCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
};

export type GrowthAreaCriterionRow = {
  interviewId: string;
  criterionId: string;
  competencyId: string;
  competencyName: string;
  competencySlug: string;
  result: TrainingSessionResultMark;
  weight: number;
  growthArea: string | null;
  isGrowthPoint: boolean;
  comment: string | null;
  title: string;
  assessedAt: Date;
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

  listTeamEmployees() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
      select: teamEmployeeSelect,
      orderBy: [{ displayName: 'asc' }, { login: 'asc' }, { id: 'asc' }],
    });
  }

  getTeamAnswerSummaries() {
    return this.prisma.$queryRaw<TeamAnswerSummaryRow[]>(Prisma.sql`
      WITH answer_results AS (
        SELECT
          s."userId",
          r.result,
          s."finishedAt" AS "activityAt"
        FROM training_session_results r
        INNER JOIN training_sessions s ON s.id = r."sessionId"

        UNION ALL

        SELECT
          i."intervieweeId" AS "userId",
          iq.result,
          i."completedAt" AS "activityAt"
        FROM interview_questions iq
        INNER JOIN interviews i ON i.id = iq."interviewId"
        WHERE
          i.status = 'COMPLETED'
          AND i."completedAt" IS NOT NULL
          AND iq.result IS NOT NULL
      )
      SELECT
        ar."userId",
        COUNT(*)::int AS "totalAnswers",
        COUNT(*) FILTER (WHERE ar.result = 'CORRECT')::int AS "correctCount",
        COUNT(*) FILTER (WHERE ar.result = 'INCORRECT')::int AS "incorrectCount",
        COUNT(*) FILTER (WHERE ar.result = 'PARTIAL')::int AS "partialCount",
        MAX(ar."activityAt") AS "lastActivityAt"
      FROM answer_results ar
      GROUP BY ar."userId"
    `);
  }

  getTeamActivitySummaries() {
    return this.prisma.$queryRaw<TeamActivitySummaryRow[]>(Prisma.sql`
      WITH training AS (
        SELECT
          s."userId",
          COUNT(*)::int AS "trainingSessionsCount",
          COUNT(*) FILTER (WHERE s.feedback IS NOT NULL)::int AS "trainingFeedbackCount",
          MAX(s."finishedAt") AS "lastTrainingAt"
        FROM training_sessions s
        GROUP BY s."userId"
      ),
      completed_interviews AS (
        SELECT
          i."intervieweeId" AS "userId",
          COUNT(*)::int AS "completedInterviewsCount",
          COUNT(*) FILTER (WHERE i.feedback IS NOT NULL)::int AS "interviewFeedbackCount",
          MAX(i."completedAt") AS "lastInterviewAt"
        FROM interviews i
        WHERE
          i.status = 'COMPLETED'
          AND i."completedAt" IS NOT NULL
        GROUP BY i."intervieweeId"
      )
      SELECT
        COALESCE(training."userId", completed_interviews."userId") AS "userId",
        COALESCE(training."trainingSessionsCount", 0)::int AS "trainingSessionsCount",
        COALESCE(completed_interviews."completedInterviewsCount", 0)::int AS "completedInterviewsCount",
        (
          COALESCE(training."trainingFeedbackCount", 0) +
          COALESCE(completed_interviews."interviewFeedbackCount", 0)
        )::int AS "feedbackCount",
        NULLIF(
          GREATEST(
            COALESCE(training."lastTrainingAt", '1970-01-01'::timestamp),
            COALESCE(completed_interviews."lastInterviewAt", '1970-01-01'::timestamp)
          ),
          '1970-01-01'::timestamp
        ) AS "lastActivityAt"
      FROM training
      FULL OUTER JOIN completed_interviews
        ON completed_interviews."userId" = training."userId"
    `);
  }

  getTeamGrowthTopicStats() {
    return this.prisma.$queryRaw<TeamGrowthTopicRow[]>(Prisma.sql`
      WITH topic_results AS (
        SELECT
          s."userId",
          rt."topicId",
          rt."topicName",
          rt."topicSlug",
          r.result
        FROM training_session_result_topics rt
        INNER JOIN training_session_results r ON r.id = rt."resultId"
        INNER JOIN training_sessions s ON s.id = r."sessionId"

        UNION ALL

        SELECT
          i."intervieweeId" AS "userId",
          iqt."topicId",
          iqt."topicName",
          iqt."topicSlug",
          iq.result
        FROM interview_question_topics iqt
        INNER JOIN interview_questions iq ON iq.id = iqt."interviewQuestionId"
        INNER JOIN interviews i ON i.id = iq."interviewId"
        WHERE
          i.status = 'COMPLETED'
          AND iq.result IS NOT NULL
      )
      SELECT
        tr."userId",
        tr."topicId",
        tr."topicName" AS name,
        tr."topicSlug" AS slug,
        COUNT(*) FILTER (WHERE tr.result = 'CORRECT')::int AS "correctCount",
        COUNT(*) FILTER (WHERE tr.result = 'INCORRECT')::int AS "incorrectCount",
        COUNT(*) FILTER (WHERE tr.result = 'PARTIAL')::int AS "partialCount"
      FROM topic_results tr
      GROUP BY tr."userId", tr."topicId", tr."topicName", tr."topicSlug"
      ORDER BY
        tr."userId" ASC,
        (
          COUNT(*) FILTER (WHERE tr.result = 'INCORRECT') +
          COUNT(*) FILTER (WHERE tr.result = 'PARTIAL')
        ) DESC,
        (
          COUNT(*) FILTER (WHERE tr.result = 'CORRECT')::numeric /
          NULLIF(COUNT(*), 0)
        ) ASC NULLS FIRST,
        tr."topicName" ASC,
        tr."topicId" DESC
    `);
  }

  getTeamStackLevelRows() {
    return this.prisma.$queryRaw<TeamStackLevelRow[]>(Prisma.sql`
      SELECT
        i."intervieweeId" AS "userId",
        c."stackId",
        s.name AS "stackName",
        s.slug AS "stackSlug",
        COALESCE(SUM(GREATEST(iqc.weight, 1)), 0)::int AS "totalCount",
        COALESCE(SUM(GREATEST(iqc.weight, 1)) FILTER (WHERE iqc.result = 'CORRECT'), 0)::int AS "correctCount",
        COALESCE(SUM(GREATEST(iqc.weight, 1)) FILTER (WHERE iqc.result = 'PARTIAL'), 0)::int AS "partialCount",
        COALESCE(SUM(GREATEST(iqc.weight, 1)) FILTER (WHERE iqc.result = 'INCORRECT'), 0)::int AS "incorrectCount"
      FROM interview_question_criteria iqc
      INNER JOIN competencies c ON c.id = iqc."competencyId"
      INNER JOIN technology_stacks s ON s.id = c."stackId"
      INNER JOIN interview_questions iq ON iq.id = iqc."interviewQuestionId"
      INNER JOIN interviews i ON i.id = iq."interviewId"
      WHERE
        i.status = 'COMPLETED'
        AND i."completedAt" IS NOT NULL
        AND iqc.result IS NOT NULL
      GROUP BY i."intervieweeId", c."stackId", s.name, s.slug
    `);
  }

  async listGrowthAreaCriteria(userId: string): Promise<GrowthAreaCriterionRow[]> {
    const rows = await this.prisma.interviewQuestionCriterion.findMany({
      where: {
        competencyId: {
          not: null,
        },
        result: {
          not: null,
        },
        interviewQuestion: {
          interview: {
            status: InterviewStatus.COMPLETED,
            completedAt: {
              not: null,
            },
            intervieweeId: userId,
          },
        },
        OR: [
          { isGrowthPoint: true },
          { growthArea: { not: null } },
          { result: { not: TrainingSessionResultMark.CORRECT } },
        ],
      },
      select: {
        id: true,
        competencyId: true,
        competencyName: true,
        competencySlug: true,
        result: true,
        weight: true,
        growthArea: true,
        isGrowthPoint: true,
        comment: true,
        title: true,
        interviewQuestion: {
          select: {
            interview: {
              select: {
                id: true,
                completedAt: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          interviewQuestion: {
            interview: {
              completedAt: 'desc',
            },
          },
        },
        { id: 'desc' },
      ],
    });

    return rows.flatMap((row) => {
      const assessedAt = row.interviewQuestion.interview.completedAt;

      if (!row.competencyId || !row.competencyName || !row.competencySlug || !row.result || !assessedAt) {
        return [];
      }

      return [{
        interviewId: row.interviewQuestion.interview.id,
        criterionId: row.id,
        competencyId: row.competencyId,
        competencyName: row.competencyName,
        competencySlug: row.competencySlug,
        result: row.result,
        weight: row.weight,
        growthArea: row.growthArea,
        isGrowthPoint: row.isGrowthPoint,
        comment: row.comment,
        title: row.title,
        assessedAt,
      }];
    });
  }
}
