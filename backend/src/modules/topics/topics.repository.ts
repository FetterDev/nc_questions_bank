import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { isLegacyTopicId } from '../questions/question-payload';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

type TopicRecord = {
  id: string;
  name: string;
  slug: string;
};

export type TopicOutput = TopicRecord & {
  questionsCount: number;
};

@Injectable()
export class TopicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    params: {
      q?: string;
      usedOnly: boolean;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where = this.buildWhere(params.q, params.usedOnly);
    const client = this.getDb(db);
    const [items, total] = await Promise.all([
      client.topic.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: params.limit,
        skip: params.offset,
      }),
      client.topic.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        questionsCount: item._count.questions,
      })),
      total,
    };
  }

  async findById(id: string, db?: DbClient): Promise<TopicOutput | null> {
    const item = await this.getDb(db).topic.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!item) {
      return null;
    }

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      questionsCount: item._count.questions,
    };
  }

  findByIds(ids: string[], db?: DbClient): Promise<TopicRecord[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).topic.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  findBySlugs(slugs: string[], db?: DbClient): Promise<TopicRecord[]> {
    if (slugs.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).topic.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async resolveSnapshotTopics(
    snapshotTopics: Array<{ id: string; name: string; slug: string }>,
    db?: DbClient,
  ): Promise<Array<TopicRecord | null>> {
    if (snapshotTopics.length === 0) {
      return [];
    }

    const client = this.getDb(db);
    const realIds = Array.from(
      new Set(
        snapshotTopics
          .map((topic) => topic.id)
          .filter((topicId) => !isLegacyTopicId(topicId)),
      ),
    );
    const legacySlugs = Array.from(
      new Set(
        snapshotTopics
          .filter((topic) => isLegacyTopicId(topic.id))
          .map((topic) => topic.slug),
      ),
    );
    const legacyNames = Array.from(
      new Set(
        snapshotTopics
          .filter((topic) => isLegacyTopicId(topic.id))
          .map((topic) => topic.name.trim().toLocaleLowerCase('ru-RU'))
          .filter(Boolean),
      ),
    );

    const nameConditions = legacyNames.map((name) => ({
      name: {
        equals: name,
        mode: Prisma.QueryMode.insensitive,
      },
    }));

    const or: Prisma.TopicWhereInput[] = [];

    if (realIds.length > 0) {
      or.push({
        id: {
          in: realIds,
        },
      });
    }

    if (legacySlugs.length > 0) {
      or.push({
        slug: {
          in: legacySlugs,
        },
      });
    }

    if (nameConditions.length > 0) {
      or.push(...nameConditions);
    }

    const found = await client.topic.findMany({
      where: {
        OR: or,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    const byId = new Map(found.map((topic) => [topic.id, topic]));
    const bySlug = new Map(found.map((topic) => [topic.slug, topic]));
    const byName = new Map(
      found.map((topic) => [topic.name.toLocaleLowerCase('ru-RU'), topic]),
    );

    return snapshotTopics.map((topic) => {
      if (!isLegacyTopicId(topic.id)) {
        return byId.get(topic.id) ?? null;
      }

      return (
        bySlug.get(topic.slug) ??
        byName.get(topic.name.trim().toLocaleLowerCase('ru-RU')) ??
        null
      );
    });
  }

  create(
    data: {
      name: string;
      slug: string;
    },
    db?: DbClient,
  ) {
    return this.getDb(db).topic.create({
      data,
      select: {
        id: true,
      },
    });
  }

  update(
    id: string,
    data: {
      name: string;
      slug: string;
    },
    db?: DbClient,
  ) {
    return this.getDb(db).topic.update({
      where: { id },
      data,
      select: {
        id: true,
      },
    });
  }

  private buildWhere(
    q: string | undefined,
    usedOnly: boolean,
  ): Prisma.TopicWhereInput {
    const where: Prisma.TopicWhereInput = {};
    const normalizedQ = q?.trim();

    if (normalizedQ) {
      where.OR = [
        {
          name: {
            contains: normalizedQ,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          slug: {
            contains: normalizedQ.toLowerCase(),
          },
        },
      ];
    }

    if (usedOnly) {
      where.questions = {
        some: {},
      };
    }

    return where;
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
