import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  QuestionStructuredContent,
  coerceQuestionStructuredContent,
  toQuestionStructuredContentJson,
} from './question-structured-content';
import { QuestionDifficultyRank } from './question-difficulty';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

const questionInclude = {
  company: true,
  topics: {
    include: {
      topic: true,
    },
  },
  competencies: {
    include: {
      competency: {
        include: {
          stack: true,
        },
      },
    },
  },
  evaluationCriteria: {
    include: {
      competency: {
        include: {
          stack: true,
        },
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.QuestionInclude;

type QuestionWithTopics = Prisma.QuestionGetPayload<{
  include: typeof questionInclude;
}>;

export type QuestionOutput = {
  id: string;
  text: string;
  textContent: QuestionStructuredContent;
  answer: string;
  answerContent: QuestionStructuredContent;
  difficulty: QuestionDifficultyRank;
  company: {
    id: string;
    name: string;
  } | null;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  competencies: Array<{
    id: string;
    name: string;
    slug: string;
    stack: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  evaluationCriteria: Array<{
    id: string;
    title: string;
    description: string | null;
    weight: number;
    position: number;
    competency: {
      id: string;
      name: string;
      slug: string;
      stack: {
        id: string;
        name: string;
        slug: string;
      };
    } | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      text: string;
      textContent: QuestionStructuredContent;
      answer: string;
      answerContent: QuestionStructuredContent;
      difficulty: QuestionDifficultyRank;
      companyId: string | null;
      topicIds: string[];
      competencyIds?: string[];
      evaluationCriteria?: Array<{
        title: string;
        description: string | null;
        weight: number;
        position: number;
        competencyId: string | null;
      }>;
    },
    db?: DbClient,
  ): Promise<QuestionOutput> {
    const created = await this.getDb(db).question.create({
      data: {
        text: data.text,
        textContent: toQuestionStructuredContentJson(data.textContent),
        answer: data.answer,
        answerContent: toQuestionStructuredContentJson(data.answerContent),
        difficulty: data.difficulty,
        ...(data.companyId
          ? {
              company: {
                connect: {
                  id: data.companyId,
                },
              },
            }
          : {}),
        topics: {
          create: data.topicIds.map((topicId) => ({
            topic: {
              connect: {
                id: topicId,
              },
            },
          })),
        },
        competencies: data.competencyIds
          ? {
              create: data.competencyIds.map((competencyId) => ({
                competency: {
                  connect: {
                    id: competencyId,
                  },
                },
              })),
            }
          : undefined,
        evaluationCriteria: data.evaluationCriteria
          ? {
              create: data.evaluationCriteria.map((criterion) => ({
                title: criterion.title,
                description: criterion.description,
                weight: criterion.weight,
                position: criterion.position,
                competency: criterion.competencyId
                  ? {
                      connect: {
                        id: criterion.competencyId,
                      },
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: questionInclude,
    });

    return this.mapQuestion(created);
  }

  async findAll(
    params: {
      difficulty?: QuestionDifficultyRank;
      topic?: { slug: string; name: string };
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ): Promise<QuestionOutput[]> {
    const where: Prisma.QuestionWhereInput = {};

    if (params.difficulty !== undefined) {
      where.difficulty = params.difficulty;
    }

    if (params.topic) {
      where.topics = {
        some: {
          topic: {
            OR: [
              { slug: params.topic.slug },
              { name: { equals: params.topic.name, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    const items = await this.getDb(db).question.findMany({
      where,
      include: {
        ...questionInclude,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit,
      skip: params.offset,
    });

    return items.map((item) => this.mapQuestion(item));
  }

  async findOne(id: string, db?: DbClient): Promise<QuestionOutput | null> {
    const found = await this.getDb(db).question.findUnique({
      where: { id },
      include: questionInclude,
    });

    if (!found) {
      return null;
    }

    return this.mapQuestion(found);
  }

  async findByIds(ids: string[], db?: DbClient): Promise<QuestionOutput[]> {
    if (ids.length === 0) {
      return [];
    }

    const items = await this.getDb(db).question.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: questionInclude,
    });

    return items.map((item) => this.mapQuestion(item));
  }

  async exists(id: string, db?: DbClient): Promise<boolean> {
    const found = await this.getDb(db).question.findUnique({
      where: { id },
      select: { id: true },
    });

    return Boolean(found);
  }

  async update(
    id: string,
    data: {
      text?: string;
      textContent?: QuestionStructuredContent;
      answer?: string;
      answerContent?: QuestionStructuredContent;
      difficulty?: QuestionDifficultyRank;
      companyId?: string | null;
      topicIds?: string[];
      competencyIds?: string[];
      evaluationCriteria?: Array<{
        title: string;
        description: string | null;
        weight: number;
        position: number;
        competencyId: string | null;
      }>;
    },
    db?: DbClient,
  ): Promise<QuestionOutput> {
    const updateData: Prisma.QuestionUpdateInput = {};

    if (data.text !== undefined) {
      updateData.text = data.text;
    }

    if (data.textContent !== undefined) {
      updateData.textContent = toQuestionStructuredContentJson(data.textContent);
    }

    if (data.answer !== undefined) {
      updateData.answer = data.answer;
    }

    if (data.answerContent !== undefined) {
      updateData.answerContent = toQuestionStructuredContentJson(data.answerContent);
    }

    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty;
    }

    if (data.companyId !== undefined) {
      updateData.company = data.companyId
        ? {
            connect: {
              id: data.companyId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (data.topicIds !== undefined) {
      updateData.topics = {
        deleteMany: {},
        create: data.topicIds.map((topicId) => ({
          topic: {
            connect: {
              id: topicId,
            },
          },
        })),
      };
    }

    if (data.competencyIds !== undefined) {
      updateData.competencies = {
        deleteMany: {},
        create: data.competencyIds.map((competencyId) => ({
          competency: {
            connect: {
              id: competencyId,
            },
          },
        })),
      };
    }

    if (data.evaluationCriteria !== undefined) {
      updateData.evaluationCriteria = {
        deleteMany: {},
        create: data.evaluationCriteria.map((criterion) => ({
          title: criterion.title,
          description: criterion.description,
          weight: criterion.weight,
          position: criterion.position,
          competency: criterion.competencyId
            ? {
                connect: {
                  id: criterion.competencyId,
                },
              }
            : undefined,
        })),
      };
    }

    const updated = await this.getDb(db).question.update({
      where: { id },
      data: updateData,
      include: questionInclude,
    });

    return this.mapQuestion(updated);
  }

  async remove(id: string, db?: DbClient): Promise<void> {
    await this.getDb(db).question.delete({ where: { id } });
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }

  private mapQuestion(question: QuestionWithTopics): QuestionOutput {
    return {
      id: question.id,
      text: question.text,
      textContent:
        coerceQuestionStructuredContent(question.textContent, question.text) ?? [
          { kind: 'text', content: question.text },
        ],
      answer: question.answer,
      answerContent:
        coerceQuestionStructuredContent(question.answerContent, question.answer) ?? [
          { kind: 'text', content: question.answer },
        ],
      difficulty: question.difficulty as QuestionDifficultyRank,
      company: question.company
        ? {
            id: question.company.id,
            name: question.company.name,
          }
        : null,
      topics: [...question.topics]
        .sort((left, right) =>
          left.topic.slug.localeCompare(right.topic.slug, 'ru-RU'),
        )
        .map((topicLink) => ({
          id: topicLink.topic.id,
          name: topicLink.topic.name,
          slug: topicLink.topic.slug,
        })),
      competencies: [...question.competencies]
        .sort(
          (left, right) =>
            left.competency.stack.slug.localeCompare(
              right.competency.stack.slug,
              'ru-RU',
            ) ||
            left.competency.slug.localeCompare(right.competency.slug, 'ru-RU'),
        )
        .map((competencyLink) => ({
          id: competencyLink.competency.id,
          name: competencyLink.competency.name,
          slug: competencyLink.competency.slug,
          stack: {
            id: competencyLink.competency.stack.id,
            name: competencyLink.competency.stack.name,
            slug: competencyLink.competency.stack.slug,
          },
        })),
      evaluationCriteria: question.evaluationCriteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description,
        weight: criterion.weight,
        position: criterion.position,
        competency: criterion.competency
          ? {
              id: criterion.competency.id,
              name: criterion.competency.name,
              slug: criterion.competency.slug,
              stack: {
                id: criterion.competency.stack.id,
                name: criterion.competency.stack.name,
                slug: criterion.competency.stack.slug,
              },
            }
          : null,
      })),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }
}
