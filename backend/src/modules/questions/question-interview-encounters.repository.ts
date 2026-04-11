import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

export type QuestionInterviewEncounterState = {
  count: number;
  checkedByCurrentUser: boolean;
};

@Injectable()
export class QuestionInterviewEncountersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async mark(questionId: string, userId: string, db?: DbClient) {
    await this.getDb(db).questionInterviewEncounter.upsert({
      where: {
        questionId_userId: {
          questionId,
          userId,
        },
      },
      create: {
        questionId,
        userId,
      },
      update: {},
    });
  }

  async unmark(questionId: string, userId: string, db?: DbClient) {
    await this.getDb(db).questionInterviewEncounter.deleteMany({
      where: {
        questionId,
        userId,
      },
    });
  }

  async getStatesForQuestions(questionIds: string[], viewerId: string, db?: DbClient) {
    if (questionIds.length === 0) {
      return new Map<string, QuestionInterviewEncounterState>();
    }

    const rows = await this.getDb(db).questionInterviewEncounter.findMany({
      where: {
        questionId: {
          in: questionIds,
        },
      },
      select: {
        questionId: true,
        userId: true,
      },
    });

    const states = new Map<string, QuestionInterviewEncounterState>();

    for (const questionId of questionIds) {
      states.set(questionId, {
        count: 0,
        checkedByCurrentUser: false,
      });
    }

    for (const row of rows) {
      const current = states.get(row.questionId);

      if (!current) {
        continue;
      }

      current.count += 1;

      if (row.userId === viewerId) {
        current.checkedByCurrentUser = true;
      }
    }

    return states;
  }

  async getStateForQuestion(questionId: string, viewerId: string, db?: DbClient) {
    const states = await this.getStatesForQuestions([questionId], viewerId, db);

    return (
      states.get(questionId) ?? {
        count: 0,
        checkedByCurrentUser: false,
      }
    );
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
