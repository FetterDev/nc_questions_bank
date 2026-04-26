import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

export type StackOutput = {
  id: string;
  name: string;
  slug: string;
  competenciesCount: number;
};

export type CompetencyOutput = {
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

@Injectable()
export class CompetenciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listStacks(
    params: {
      q?: string;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where = this.buildStackWhere(params.q);
    const client = this.getDb(db);
    const [items, total] = await Promise.all([
      client.technologyStack.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              competencies: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: params.limit,
        skip: params.offset,
      }),
      client.technologyStack.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapStack(item)),
      total,
    };
  }

  async findStackById(id: string, db?: DbClient) {
    const item = await this.getDb(db).technologyStack.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            competencies: true,
          },
        },
      },
    });

    return item ? this.mapStack(item) : null;
  }

  findStacksByIds(ids: string[], db?: DbClient) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).technologyStack.findMany({
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

  async createStack(data: { name: string; slug: string }, db?: DbClient) {
    const created = await this.getDb(db).technologyStack.create({
      data,
      select: {
        id: true,
      },
    });

    return this.findStackById(created.id, db);
  }

  async updateStack(
    id: string,
    data: { name: string; slug: string },
    db?: DbClient,
  ) {
    await this.getDb(db).technologyStack.update({
      where: { id },
      data,
    });

    return this.findStackById(id, db);
  }

  async listCompetencies(
    params: {
      q?: string;
      stackId?: string;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where = this.buildCompetencyWhere(params.q, params.stackId);
    const client = this.getDb(db);
    const [items, total] = await Promise.all([
      client.competency.findMany({
        where,
        include: {
          stack: true,
        },
        orderBy: [{ stack: { name: 'asc' } }, { position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        take: params.limit,
        skip: params.offset,
      }),
      client.competency.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapCompetency(item)),
      total,
    };
  }

  async findCompetencyById(id: string, db?: DbClient) {
    const item = await this.getDb(db).competency.findUnique({
      where: { id },
      include: {
        stack: true,
      },
    });

    return item ? this.mapCompetency(item) : null;
  }

  findCompetenciesByIds(ids: string[], db?: DbClient) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).competency.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        stack: true,
      },
    });
  }

  async createCompetency(
    data: {
      stackId: string;
      name: string;
      slug: string;
      description: string | null;
      position: number;
    },
    db?: DbClient,
  ) {
    const created = await this.getDb(db).competency.create({
      data,
      select: {
        id: true,
      },
    });

    return this.findCompetencyById(created.id, db);
  }

  async updateCompetency(
    id: string,
    data: {
      stackId?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      position?: number;
    },
    db?: DbClient,
  ) {
    await this.getDb(db).competency.update({
      where: { id },
      data,
    });

    return this.findCompetencyById(id, db);
  }

  async getNextCompetencyPosition(stackId: string, db?: DbClient) {
    const aggregate = await this.getDb(db).competency.aggregate({
      where: {
        stackId,
      },
      _max: {
        position: true,
      },
    });

    return (aggregate._max.position ?? 0) + 1;
  }

  private buildStackWhere(q?: string): Prisma.TechnologyStackWhereInput {
    if (!q) {
      return {};
    }

    return {
      OR: [
        {
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  private buildCompetencyWhere(
    q?: string,
    stackId?: string,
  ): Prisma.CompetencyWhereInput {
    const where: Prisma.CompetencyWhereInput = {};

    if (stackId) {
      where.stackId = stackId;
    }

    if (q) {
      where.OR = [
        {
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private mapStack(item: {
    id: string;
    name: string;
    slug: string;
    _count: {
      competencies: number;
    };
  }): StackOutput {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      competenciesCount: item._count.competencies,
    };
  }

  private mapCompetency(item: {
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
  }): CompetencyOutput {
    return {
      id: item.id,
      stackId: item.stackId,
      stack: {
        id: item.stack.id,
        name: item.stack.name,
        slug: item.stack.slug,
      },
      name: item.name,
      slug: item.slug,
      description: item.description,
      position: item.position,
    };
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
