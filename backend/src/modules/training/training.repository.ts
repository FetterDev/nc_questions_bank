import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  TrainingSessionStatus,
  TrainingSessionResultMark,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  QuestionStructuredContent,
  coerceQuestionStructuredContent,
  toQuestionStructuredContentJson,
} from '../questions/question-structured-content';
import {
  fromDifficultyRank,
  QuestionDifficulty,
  QuestionDifficultyRank,
} from '../questions/question-difficulty';
import {
  fromTrainingResultDb,
  toTrainingResultDb,
  TrainingResult,
} from './training-result';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

type TrainingHistorySessionRow = {
  id: string;
  status: TrainingSessionStatus;
  resultsCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  feedback: string | null;
  finishedAt: Date;
  trainerId: string | null;
  trainerDisplayName: string | null;
  trainerLogin: string | null;
};

type TrainingHistoryResultRow = {
  questionId: string;
  text: string;
  textContent: unknown;
  difficulty: number;
  result: TrainingSessionResultMark;
  position: number;
  topics: Array<{ id: string; name: string; slug: string }>;
};

export type TrainingHistorySessionOutput = {
  id: string;
  status: TrainingSessionStatus;
  resultsCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  feedback: string | null;
  finishedAt: Date;
  trainer: {
    id: string;
    displayName: string;
    login: string;
  } | null;
};

export type TrainingHistoryDetailOutput = TrainingHistorySessionOutput & {
  results: Array<{
    questionId: string;
    text: string;
    textContent: QuestionStructuredContent;
    difficulty: QuestionDifficulty;
    result: TrainingResult;
    position: number;
    topics: Array<{ id: string; name: string; slug: string }>;
  }>;
};

export type SaveTrainingSessionInput = {
  userId: string;
  trainerId: string | null;
  status: TrainingSessionStatus;
  resultsCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  feedback: string | null;
  finishedAt: Date;
  items: Array<{
    questionId: string;
    questionText: string;
    questionTextContent: QuestionStructuredContent;
    difficulty: QuestionDifficultyRank;
    result: TrainingResult;
    position: number;
    topics: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
};

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) {}

  saveTrainingSession(data: SaveTrainingSessionInput, db?: DbClient) {
    return this.getDb(db).trainingSession.create({
      data: {
        userId: data.userId,
        trainerId: data.trainerId,
        status: data.status,
        resultsCount: data.resultsCount,
        correctCount: data.correctCount,
        incorrectCount: data.incorrectCount,
        partialCount: data.partialCount,
        feedback: data.feedback,
        finishedAt: data.finishedAt,
        results: {
          create: data.items.map((item) => ({
            questionId: item.questionId,
            questionText: item.questionText,
            questionTextContent: toQuestionStructuredContentJson(item.questionTextContent),
            difficulty: item.difficulty,
            result: toTrainingResultDb(item.result),
            position: item.position,
            topics: {
              create: item.topics.map((topic) => ({
                topicId: topic.id,
                topicName: topic.name,
                topicSlug: topic.slug,
              })),
            },
          })),
        },
      },
      select: {
        id: true,
        status: true,
        resultsCount: true,
        correctCount: true,
        incorrectCount: true,
        partialCount: true,
        finishedAt: true,
      },
    });
  }

  async listHistory(userId: string) {
    const rows = await this.prisma.$queryRaw<TrainingHistorySessionRow[]>(Prisma.sql`
      SELECT
        s.id,
        s.status,
        s."resultsCount",
        s."correctCount",
        s."incorrectCount",
        s."partialCount",
        s.feedback,
        s."finishedAt",
        trainer.id AS "trainerId",
        trainer."displayName" AS "trainerDisplayName",
        trainer.login AS "trainerLogin"
      FROM training_sessions s
      LEFT JOIN users trainer ON trainer.id = s."trainerId"
      WHERE s."userId" = ${userId}
      ORDER BY
        s."finishedAt" DESC,
        s."createdAt" DESC,
        s.id DESC
    `);

    return rows.map((row) => this.mapHistorySession(row));
  }

  async getHistoryDetail(userId: string, sessionId: string) {
    const [session] = await this.prisma.$queryRaw<TrainingHistorySessionRow[]>(Prisma.sql`
      SELECT
        s.id,
        s.status,
        s."resultsCount",
        s."correctCount",
        s."incorrectCount",
        s."partialCount",
        s.feedback,
        s."finishedAt",
        trainer.id AS "trainerId",
        trainer."displayName" AS "trainerDisplayName",
        trainer.login AS "trainerLogin"
      FROM training_sessions s
      LEFT JOIN users trainer ON trainer.id = s."trainerId"
      WHERE
        s.id = ${sessionId}
        AND s."userId" = ${userId}
      LIMIT 1
    `);

    if (!session) {
      return null;
    }

    const results = await this.prisma.$queryRaw<TrainingHistoryResultRow[]>(Prisma.sql`
      SELECT
        r."questionId",
        r."questionText" AS text,
        r."questionTextContent" AS "textContent",
        r.difficulty,
        r.result,
        r.position,
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
      FROM training_session_results r
      LEFT JOIN training_session_result_topics rt ON rt."resultId" = r.id
      WHERE r."sessionId" = ${sessionId}
      GROUP BY
        r.id,
        r."questionId",
        r."questionText",
        r."questionTextContent",
        r.difficulty,
        r.result,
        r.position
      ORDER BY
        r.position ASC,
        r.id ASC
    `);

    return {
      ...this.mapHistorySession(session),
      results: results.map((row) => ({
        questionId: row.questionId,
        text: row.text,
        textContent:
          coerceQuestionStructuredContent(row.textContent, row.text) ?? [
            { kind: 'text', content: row.text },
          ],
        difficulty: fromDifficultyRank(row.difficulty),
        result: fromTrainingResultDb(row.result),
        position: row.position,
        topics: row.topics,
      })),
    } satisfies TrainingHistoryDetailOutput;
  }

  private mapHistorySession(row: TrainingHistorySessionRow): TrainingHistorySessionOutput {
    return {
      id: row.id,
      status: row.status,
      resultsCount: row.resultsCount,
      correctCount: row.correctCount,
      incorrectCount: row.incorrectCount,
      partialCount: row.partialCount,
      feedback: row.feedback,
      finishedAt: row.finishedAt,
      trainer:
        row.trainerId && row.trainerDisplayName && row.trainerLogin
          ? {
              id: row.trainerId,
              displayName: row.trainerDisplayName,
              login: row.trainerLogin,
            }
          : null,
    };
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
