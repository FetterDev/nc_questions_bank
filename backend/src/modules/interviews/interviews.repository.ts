import { Injectable } from '@nestjs/common';
import {
  InterviewCycleMode,
  InterviewStatus,
  Prisma,
  PrismaClient,
  TrainingSessionResultMark,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  QuestionStructuredContent,
  coerceQuestionStructuredContent,
  toQuestionStructuredContentJson,
} from '../questions/question-structured-content';
import { QuestionDifficultyRank } from '../questions/question-difficulty';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

const interviewInclude = {
  cycle: {
    include: {
      createdByAdmin: true,
    },
  },
  interviewer: true,
  interviewee: true,
  preset: true,
  questions: {
    include: {
      topics: true,
      criteria: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.InterviewInclude;

type InterviewRecord = Prisma.InterviewGetPayload<{
  include: typeof interviewInclude;
}>;

type InterviewCycleRecord = Prisma.InterviewCycleGetPayload<{
  include: {
    createdByAdmin: true;
    interviews: {
      include: typeof interviewInclude;
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }];
    };
  };
}>;

export type InterviewUserOutput = {
  id: string;
  login: string;
  displayName: string;
};

export type InterviewPresetOutput = {
  id: string;
  name: string;
} | null;

export type InterviewQuestionOutput = {
  id: string;
  questionId: string;
  questionText: string;
  questionTextContent: QuestionStructuredContent;
  answer: string;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficultyRank;
  result: TrainingSessionResultMark | null;
  position: number;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  criteria: Array<{
    id: string;
    sourceCriterionId: string | null;
    competencyId: string | null;
    competencyName: string | null;
    competencySlug: string | null;
    title: string;
    description: string | null;
    weight: number;
    position: number;
    result: TrainingSessionResultMark | null;
    comment: string | null;
    isGrowthPoint: boolean;
    growthArea: string | null;
  }>;
};

export type InterviewOutput = {
  id: string;
  status: InterviewStatus;
  plannedDate: Date | null;
  completedAt: Date | null;
  feedback: string | null;
  growthAreas: string | null;
  resultsCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  interviewer: InterviewUserOutput;
  interviewee: InterviewUserOutput;
  preset: InterviewPresetOutput;
  cycle: {
    id: string;
    mode: InterviewCycleMode;
    periodStart: Date;
    periodEnd: Date;
    createdByAdmin: InterviewUserOutput;
  };
  questions: InterviewQuestionOutput[];
};

export type InterviewCycleOutput = {
  id: string;
  mode: InterviewCycleMode;
  periodStart: Date;
  periodEnd: Date;
  createdByAdmin: InterviewUserOutput;
  interviews: InterviewOutput[];
};

@Injectable()
export class InterviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCycle(
    data: {
      periodStart: Date;
      periodEnd: Date;
      mode: InterviewCycleMode;
      createdByAdminId: string;
      pairs: Array<{
        interviewerId: string;
        intervieweeId: string;
      }>;
    },
    db?: DbClient,
  ) {
    const cycle = await this.getDb(db).interviewCycle.create({
      data: {
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        mode: data.mode,
        createdByAdminId: data.createdByAdminId,
        interviews: {
          create: data.pairs.map((pair) => ({
            interviewerId: pair.interviewerId,
            intervieweeId: pair.intervieweeId,
            status: InterviewStatus.DRAFT,
          })),
        },
      },
      include: {
        createdByAdmin: true,
        interviews: {
          include: interviewInclude,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    return this.mapCycle(cycle);
  }

  async findCycleById(id: string, db?: DbClient) {
    const cycle = await this.getDb(db).interviewCycle.findUnique({
      where: { id },
      include: {
        createdByAdmin: true,
        interviews: {
          include: interviewInclude,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    return cycle ? this.mapCycle(cycle) : null;
  }

  async findLatestCycleOverlapping(
    rangeStart: Date,
    rangeEnd: Date,
    db?: DbClient,
  ) {
    const cycle = await this.getDb(db).interviewCycle.findFirst({
      where: {
        periodStart: { lte: rangeEnd },
        periodEnd: { gte: rangeStart },
      },
      include: {
        createdByAdmin: true,
        interviews: {
          include: interviewInclude,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    return cycle ? this.mapCycle(cycle) : null;
  }

  async createInterview(
    data: {
      cycleId: string;
      interviewerId: string;
      intervieweeId: string;
    },
    db?: DbClient,
  ) {
    const interview = await this.getDb(db).interview.create({
      data: {
        cycleId: data.cycleId,
        interviewerId: data.interviewerId,
        intervieweeId: data.intervieweeId,
        status: InterviewStatus.DRAFT,
      },
      include: interviewInclude,
    });

    return this.mapInterview(interview);
  }

  async findInterviewById(id: string, db?: DbClient) {
    const interview = await this.getDb(db).interview.findUnique({
      where: { id },
      include: interviewInclude,
    });

    return interview ? this.mapInterview(interview) : null;
  }

  async findInterviewDuplicate(
    cycleId: string,
    interviewerId: string,
    intervieweeId: string,
    excludeId?: string,
    db?: DbClient,
  ) {
    const duplicate = await this.getDb(db).interview.findFirst({
      where: {
        cycleId,
        interviewerId,
        intervieweeId,
        ...(excludeId
          ? {
              id: {
                not: excludeId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return Boolean(duplicate);
  }

  async updateInterview(
    id: string,
    data: {
      interviewerId?: string;
      intervieweeId?: string;
      plannedDate?: Date | null;
      presetId?: string | null;
      status?: InterviewStatus;
      completedAt?: Date | null;
      feedback?: string | null;
      growthAreas?: string | null;
      resultsCount?: number;
      correctCount?: number;
      incorrectCount?: number;
      partialCount?: number;
    },
    db?: DbClient,
  ) {
    const updateData: Prisma.InterviewUpdateInput = {};

    if (data.interviewerId !== undefined) {
      updateData.interviewer = {
        connect: {
          id: data.interviewerId,
        },
      };
    }

    if (data.intervieweeId !== undefined) {
      updateData.interviewee = {
        connect: {
          id: data.intervieweeId,
        },
      };
    }

    if (data.plannedDate !== undefined) {
      updateData.plannedDate = data.plannedDate;
    }

    if (data.presetId !== undefined) {
      updateData.preset = data.presetId
        ? {
            connect: {
              id: data.presetId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt;
    }

    if (data.feedback !== undefined) {
      updateData.feedback = data.feedback;
    }

    if (data.growthAreas !== undefined) {
      updateData.growthAreas = data.growthAreas;
    }

    if (data.resultsCount !== undefined) {
      updateData.resultsCount = data.resultsCount;
    }

    if (data.correctCount !== undefined) {
      updateData.correctCount = data.correctCount;
    }

    if (data.incorrectCount !== undefined) {
      updateData.incorrectCount = data.incorrectCount;
    }

    if (data.partialCount !== undefined) {
      updateData.partialCount = data.partialCount;
    }

    const interview = await this.getDb(db).interview.update({
      where: { id },
      data: updateData,
      include: interviewInclude,
    });

    return this.mapInterview(interview);
  }

  async deleteInterview(id: string, db?: DbClient) {
    await this.getDb(db).interview.delete({
      where: { id },
    });
  }

  async replaceQuestions(
    interviewId: string,
    items: Array<{
      questionId: string;
      questionText: string;
      questionTextContent: QuestionStructuredContent;
      answer: string;
      answerContent: QuestionStructuredContent;
      difficulty: QuestionDifficultyRank;
      position: number;
      topics: Array<{
        id: string;
        name: string;
        slug: string;
      }>;
      criteria?: Array<{
        sourceCriterionId: string | null;
        competencyId: string | null;
        competencyName: string | null;
        competencySlug: string | null;
        title: string;
        description: string | null;
        weight: number;
        position: number;
      }>;
    }>,
    db?: DbClient,
  ) {
    await this.getDb(db).interviewQuestion.deleteMany({
      where: {
        interviewId,
      },
    });

    if (items.length === 0) {
      return;
    }

    await this.getDb(db).interview.update({
      where: { id: interviewId },
      data: {
        questions: {
          create: items.map((item) => ({
            questionId: item.questionId,
            questionText: item.questionText,
            questionTextContent: toQuestionStructuredContentJson(item.questionTextContent),
            answer: item.answer,
            answerContent: toQuestionStructuredContentJson(item.answerContent),
            difficulty: item.difficulty,
            position: item.position,
            topics: {
              create: item.topics.map((topic) => ({
                topicId: topic.id,
                topicName: topic.name,
                topicSlug: topic.slug,
              })),
            },
            criteria: item.criteria
              ? {
                  create: item.criteria.map((criterion) => ({
                    sourceCriterionId: criterion.sourceCriterionId,
                    competencyId: criterion.competencyId,
                    competencyName: criterion.competencyName,
                    competencySlug: criterion.competencySlug,
                    title: criterion.title,
                    description: criterion.description,
                    weight: criterion.weight,
                    position: criterion.position,
                  })),
                }
              : undefined,
          })),
        },
      },
    });
  }

  async updateQuestionResults(
    interviewId: string,
    items: Array<{
      interviewQuestionId: string;
      result: TrainingSessionResultMark;
      criteriaResults?: Array<{
        criterionId: string;
        result: TrainingSessionResultMark;
        comment: string | null;
        isGrowthPoint: boolean;
        growthArea: string | null;
      }>;
    }>,
    db?: DbClient,
  ) {
    for (const item of items) {
      await this.getDb(db).interviewQuestion.updateMany({
        where: {
          id: item.interviewQuestionId,
          interviewId,
        },
        data: {
          result: item.result,
        },
      });

      for (const criterion of item.criteriaResults ?? []) {
        await this.getDb(db).interviewQuestionCriterion.updateMany({
          where: {
            id: criterion.criterionId,
            interviewQuestion: {
              id: item.interviewQuestionId,
              interviewId,
            },
          },
          data: {
            result: criterion.result,
            comment: criterion.comment,
            isGrowthPoint: criterion.isGrowthPoint,
            growthArea: criterion.growthArea,
          },
        });
      }
    }
  }

  listAdminMonthInterviews(monthStart: Date, nextMonthStart: Date, db?: DbClient) {
    return this.findMany(
      {
        plannedDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      db,
    );
  }

  listUserMonthInterviews(
    userId: string,
    monthStart: Date,
    nextMonthStart: Date,
    db?: DbClient,
  ) {
    return this.findMany(
      {
        plannedDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
        OR: [{ interviewerId: userId }, { intervieweeId: userId }],
      },
      db,
    );
  }

  listInterviewsOverlappingRange(rangeStart: Date, rangeEnd: Date, db?: DbClient) {
    return this.findMany(
      {
        cycle: {
          periodStart: { lte: rangeEnd },
          periodEnd: { gte: rangeStart },
        },
      },
      db,
    );
  }

  listIntervieweeInterviewsOverlappingRange(
    intervieweeId: string,
    rangeStart: Date,
    rangeEnd: Date,
    db?: DbClient,
  ) {
    return this.findMany(
      {
        intervieweeId,
        cycle: {
          periodStart: { lte: rangeEnd },
          periodEnd: { gte: rangeStart },
        },
      },
      db,
    );
  }

  listIntervieweeCompletedInterviews(intervieweeId: string, db?: DbClient) {
    return this.findMany(
      {
        intervieweeId,
        status: InterviewStatus.COMPLETED,
      },
      db,
      [{ completedAt: 'desc' }, { id: 'desc' }],
    );
  }

  listUpcoming(rangeStart: Date, rangeEnd: Date, limit = 5, db?: DbClient) {
    return this.findMany(
      {
        plannedDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: {
          in: [InterviewStatus.PLANNED, InterviewStatus.SCHEDULED],
        },
      },
      db,
      [{ plannedDate: 'asc' }, { id: 'asc' }],
      limit,
    );
  }

  listRecentCompleted(rangeStart: Date, rangeEnd: Date, limit = 5, db?: DbClient) {
    return this.findMany(
      {
        completedAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: InterviewStatus.COMPLETED,
      },
      db,
      [{ completedAt: 'desc' }, { id: 'desc' }],
      limit,
    );
  }

  findActiveUsersByIds(ids: string[], db?: DbClient) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).user.findMany({
      where: {
        id: {
          in: ids,
        },
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
      orderBy: [{ displayName: 'asc' }, { login: 'asc' }, { id: 'asc' }],
    });
  }

  private async findMany(
    where: Prisma.InterviewWhereInput,
    db?: DbClient,
    orderBy: Prisma.InterviewOrderByWithRelationInput[] = [
      { plannedDate: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    take?: number,
  ) {
    const interviews = await this.getDb(db).interview.findMany({
      where,
      include: interviewInclude,
      orderBy,
      ...(take ? { take } : {}),
    });

    return interviews.map((item) => this.mapInterview(item));
  }

  private mapCycle(cycle: InterviewCycleRecord): InterviewCycleOutput {
    return {
      id: cycle.id,
      mode: cycle.mode,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      createdByAdmin: this.mapUser(cycle.createdByAdmin),
      interviews: cycle.interviews.map((interview) => this.mapInterview(interview)),
    };
  }

  private mapInterview(interview: InterviewRecord): InterviewOutput {
    return {
      id: interview.id,
      status: interview.status,
      plannedDate: interview.plannedDate,
      completedAt: interview.completedAt,
      feedback: interview.feedback,
      growthAreas: interview.growthAreas,
      resultsCount: interview.resultsCount,
      correctCount: interview.correctCount,
      incorrectCount: interview.incorrectCount,
      partialCount: interview.partialCount,
      interviewer: this.mapUser(interview.interviewer),
      interviewee: this.mapUser(interview.interviewee),
      preset: interview.preset
        ? {
            id: interview.preset.id,
            name: interview.preset.name,
          }
        : null,
      cycle: {
        id: interview.cycle.id,
        mode: interview.cycle.mode,
        periodStart: interview.cycle.periodStart,
        periodEnd: interview.cycle.periodEnd,
        createdByAdmin: this.mapUser(interview.cycle.createdByAdmin),
      },
      questions: interview.questions.map((question) => ({
        id: question.id,
        questionId: question.questionId,
        questionText: question.questionText,
        questionTextContent:
          coerceQuestionStructuredContent(
            question.questionTextContent,
            question.questionText,
          ) ?? [{ kind: 'text', content: question.questionText }],
        answer: question.answer,
        answerContent:
          coerceQuestionStructuredContent(question.answerContent, question.answer) ??
          [{ kind: 'text', content: question.answer }],
        difficulty: question.difficulty as QuestionDifficultyRank,
        result: question.result,
        position: question.position,
        topics: question.topics.map((topic) => ({
          id: topic.topicId,
          name: topic.topicName,
          slug: topic.topicSlug,
        })),
        criteria: question.criteria.map((criterion) => ({
          id: criterion.id,
          sourceCriterionId: criterion.sourceCriterionId,
          competencyId: criterion.competencyId,
          competencyName: criterion.competencyName,
          competencySlug: criterion.competencySlug,
          title: criterion.title,
          description: criterion.description,
          weight: criterion.weight,
          position: criterion.position,
          result: criterion.result,
          comment: criterion.comment,
          isGrowthPoint: criterion.isGrowthPoint,
          growthArea: criterion.growthArea,
        })),
      })),
    };
  }

  private mapUser(user: {
    id: string;
    login: string;
    displayName: string;
  }): InterviewUserOutput {
    return {
      id: user.id,
      login: user.login,
      displayName: user.displayName,
    };
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
