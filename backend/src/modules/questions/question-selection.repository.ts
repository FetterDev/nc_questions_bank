import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  QuestionStructuredContent,
  coerceQuestionStructuredContent,
} from './question-structured-content';
import {
  fromDifficultyRank,
  QuestionDifficulty,
} from './question-difficulty';

type QuestionSelectionRow = {
  id: string;
  text: string;
  textContent: unknown;
  answer: string;
  answerContent: unknown;
  difficulty: number;
  assignedTopicId: string;
  assignedTopicName: string;
  assignedTopicSlug: string;
  topicPriority: number;
  topicPickOrder: number;
  topics: Array<{ id: string; name: string; slug: string }>;
};

type QuestionSelectionBreakdownRow = {
  id: string;
  name: string;
  slug: string;
  position: number;
  availableCount: number;
  selectedCount: number;
};

export type SelectedQuestionOutput = Omit<
  QuestionSelectionRow,
  'difficulty' | 'textContent' | 'answerContent'
> & {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficulty;
};

export type SelectedQuestionBreakdownOutput = {
  topic: {
    id: string;
    name: string;
    slug: string;
  };
  availableCount: number;
  selectedCount: number;
};

export const DEFAULT_SELECTION_QUESTIONS_PER_TOPIC = 5;

@Injectable()
export class QuestionSelectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async prepareQuestions(
    topicIds: string[],
    seed: string,
    requestedPerTopic = DEFAULT_SELECTION_QUESTIONS_PER_TOPIC,
  ) {
    const selectedTopicsSql = this.buildSelectedTopicsSql(topicIds);
    const randomOrderExpr = Prisma.sql`md5(a.id || ':' || ${seed})`;

    const items = await this.prisma.$queryRaw<QuestionSelectionRow[]>(Prisma.sql`
      WITH selected_topics AS (
        ${selectedTopicsSql}
      ),
      assigned_candidates AS (
        SELECT
          q.id,
          q.text,
          q."textContent",
          q.answer,
          q."answerContent",
          q.difficulty,
          st."topicId" AS "assignedTopicId",
          st.name AS "assignedTopicName",
          st.slug AS "assignedTopicSlug",
          st.position AS "topicPriority",
          ROW_NUMBER() OVER (
            PARTITION BY q.id
            ORDER BY st.position ASC
          ) AS "assignmentRank"
        FROM selected_topics st
        INNER JOIN question_topics qt ON qt."topicId" = st."topicId"
        INNER JOIN questions q ON q.id = qt."questionId"
      ),
      assigned AS (
        SELECT *
        FROM assigned_candidates
        WHERE "assignmentRank" = 1
      ),
      ranked AS (
        SELECT
          a.*,
          ROW_NUMBER() OVER (
            PARTITION BY a."assignedTopicId"
            ORDER BY ${randomOrderExpr}, a.id ASC
          ) AS "topicPickOrder"
        FROM assigned a
      ),
      limited AS (
        SELECT *
        FROM ranked
        WHERE "topicPickOrder" <= ${requestedPerTopic}
      )
      SELECT
        l.id,
        l.text,
        l."textContent",
        l.answer,
        l."answerContent",
        l.difficulty,
        l."assignedTopicId",
        l."assignedTopicName",
        l."assignedTopicSlug",
        l."topicPriority",
        l."topicPickOrder",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::jsonb
        ) AS topics
      FROM limited l
      LEFT JOIN question_topics qt_all ON qt_all."questionId" = l.id
      LEFT JOIN topics t ON t.id = qt_all."topicId"
      GROUP BY
        l.id,
        l.text,
        l."textContent",
        l.answer,
        l."answerContent",
        l.difficulty,
        l."assignedTopicId",
        l."assignedTopicName",
        l."assignedTopicSlug",
        l."topicPriority",
        l."topicPickOrder"
      ORDER BY
        l.difficulty ASC,
        l."topicPriority" ASC,
        l."topicPickOrder" ASC,
        l.id ASC
    `);

    const breakdown = await this.prisma.$queryRaw<QuestionSelectionBreakdownRow[]>(
      Prisma.sql`
        WITH selected_topics AS (
          ${selectedTopicsSql}
        ),
        assigned_candidates AS (
          SELECT
            q.id,
            st."topicId" AS "assignedTopicId",
            st.position,
            ROW_NUMBER() OVER (
              PARTITION BY q.id
              ORDER BY st.position ASC
            ) AS "assignmentRank"
          FROM selected_topics st
          INNER JOIN question_topics qt ON qt."topicId" = st."topicId"
          INNER JOIN questions q ON q.id = qt."questionId"
        ),
        assigned AS (
          SELECT *
          FROM assigned_candidates
          WHERE "assignmentRank" = 1
        ),
        counts AS (
          SELECT
            a."assignedTopicId",
            COUNT(*)::int AS "availableCount"
          FROM assigned a
          GROUP BY a."assignedTopicId"
        )
        SELECT
          st."topicId" AS id,
          st.name,
          st.slug,
          st.position,
          COALESCE(c."availableCount", 0)::int AS "availableCount",
          LEAST(COALESCE(c."availableCount", 0), ${requestedPerTopic})::int AS "selectedCount"
        FROM selected_topics st
        LEFT JOIN counts c ON c."assignedTopicId" = st."topicId"
        ORDER BY st.position ASC
      `,
    );

    return {
      items: items.map((item): SelectedQuestionOutput => ({
        ...item,
        textContent:
          coerceQuestionStructuredContent(item.textContent, item.text) ?? [
            { kind: 'text', content: item.text },
          ],
        answerContent:
          coerceQuestionStructuredContent(item.answerContent, item.answer) ?? [
            { kind: 'text', content: item.answer },
          ],
        difficulty: fromDifficultyRank(item.difficulty),
      })),
      breakdown: breakdown.map((item): SelectedQuestionBreakdownOutput => ({
        topic: {
          id: item.id,
          name: item.name,
          slug: item.slug,
        },
        availableCount: item.availableCount,
        selectedCount: item.selectedCount,
      })),
    };
  }

  private buildSelectedTopicsSql(topicIds: string[]) {
    return Prisma.sql`
      SELECT
        input."topicId",
        input.position,
        t.name,
        t.slug
      FROM (
        VALUES ${Prisma.join(
          topicIds.map((topicId, index) => Prisma.sql`(${topicId}, ${index})`),
        )}
      ) AS input("topicId", position)
      INNER JOIN topics t ON t.id = input."topicId"
    `;
  }
}
