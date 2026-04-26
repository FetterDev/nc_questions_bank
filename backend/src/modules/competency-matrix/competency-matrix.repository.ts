import { Injectable } from '@nestjs/common';
import {
  InterviewStatus,
  Prisma,
  PrismaClient,
  TrainingSessionResultMark,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

const matrixUserSelect = {
  id: true,
  login: true,
  displayName: true,
  role: true,
  status: true,
  stacks: {
    include: {
      stack: true,
    },
    orderBy: [{ stack: { name: 'asc' } }, { stackId: 'asc' }],
  },
} satisfies Prisma.UserSelect;

export type CompetencyMatrixUserRecord = Prisma.UserGetPayload<{
  select: typeof matrixUserSelect;
}>;

export type CompetencyMatrixCompetencyRecord = {
  id: string;
  stackId: string;
  stack: {
    id: string;
    name: string;
    slug: string;
  };
  name: string;
  slug: string;
  description: string | null;
  position: number;
};

export type CompetencyMatrixCriterionResultRecord = {
  userId: string;
  competencyId: string;
  competencyName: string | null;
  competencySlug: string | null;
  result: TrainingSessionResultMark;
  weight: number;
  assessedAt: Date;
};

@Injectable()
export class CompetencyMatrixRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(userId: string, db?: DbClient) {
    return this.getDb(db).user.findUnique({
      where: { id: userId },
      select: matrixUserSelect,
    });
  }

  updateUserStacks(userId: string, stackIds: string[], db?: DbClient) {
    return this.getDb(db).user.update({
      where: { id: userId },
      data: {
        stacks: {
          deleteMany: {},
          create: stackIds.map((stackId) => ({
            stack: {
              connect: {
                id: stackId,
              },
            },
          })),
        },
      },
      select: matrixUserSelect,
    });
  }

  findStacksByIds(ids: string[], db?: DbClient) {
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).technologyStack.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  listUsers(params: { stackId?: string }, db?: DbClient) {
    return this.getDb(db).user.findMany({
      where: {
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        ...(params.stackId
          ? {
              stacks: {
                some: {
                  stackId: params.stackId,
                },
              },
            }
          : {}),
      },
      select: matrixUserSelect,
      orderBy: [{ displayName: 'asc' }, { login: 'asc' }, { id: 'asc' }],
    });
  }

  listCompetenciesForStacks(stackIds: string[], db?: DbClient) {
    if (stackIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).competency.findMany({
      where: {
        stackId: {
          in: stackIds,
        },
      },
      include: {
        stack: true,
      },
      orderBy: [{ stack: { name: 'asc' } }, { position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  listCompetenciesByIds(ids: string[], db?: DbClient) {
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).competency.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
      include: {
        stack: true,
      },
      orderBy: [{ stack: { name: 'asc' } }, { position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  async listCompletedCriterionResultsForUsers(
    userIds: string[],
    db?: DbClient,
  ): Promise<CompetencyMatrixCriterionResultRecord[]> {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      return [];
    }

    const rows = await this.getDb(db).interviewQuestionCriterion.findMany({
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
            intervieweeId: {
              in: uniqueUserIds,
            },
          },
        },
      },
      select: {
        competencyId: true,
        competencyName: true,
        competencySlug: true,
        result: true,
        weight: true,
        interviewQuestion: {
          select: {
            interview: {
              select: {
                intervieweeId: true,
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
      if (!row.competencyId || !row.result || !row.interviewQuestion.interview.completedAt) {
        return [];
      }

      return [{
        userId: row.interviewQuestion.interview.intervieweeId,
        competencyId: row.competencyId,
        competencyName: row.competencyName,
        competencySlug: row.competencySlug,
        result: row.result,
        weight: row.weight,
        assessedAt: row.interviewQuestion.interview.completedAt,
      }];
    });
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
