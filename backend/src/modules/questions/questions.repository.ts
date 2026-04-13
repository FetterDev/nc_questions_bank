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

type QuestionWithTopics = Prisma.QuestionGetPayload<{
  include: { company: true; topics: { include: { topic: true } } };
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
      },
      include: {
        company: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
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
        company: true,
        topics: {
          include: {
            topic: true,
          },
        },
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
      include: {
        company: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
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
      include: {
        company: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
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

    const updated = await this.getDb(db).question.update({
      where: { id },
      data: updateData,
      include: {
        company: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
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
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }
}
