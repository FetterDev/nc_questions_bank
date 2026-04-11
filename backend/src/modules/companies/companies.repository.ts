import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

type CompanyRecord = {
  id: string;
  name: string;
};

export type CompanyOutput = CompanyRecord & {
  questionsCount: number;
};

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    params: {
      q?: string;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where = this.buildWhere(params.q);
    const client = this.getDb(db);
    const [items, total] = await Promise.all([
      client.company.findMany({
        where,
        select: {
          id: true,
          name: true,
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
      client.company.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        questionsCount: item._count.questions,
      })),
      total,
    };
  }

  async findById(id: string, db?: DbClient): Promise<CompanyOutput | null> {
    const item = await this.getDb(db).company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
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
      questionsCount: item._count.questions,
    };
  }

  findByNameInsensitive(name: string, db?: DbClient): Promise<CompanyRecord | null> {
    return this.getDb(db).company.findFirst({
      where: {
        name: {
          equals: name,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  findByNamesInsensitive(
    names: string[],
    db?: DbClient,
  ): Promise<CompanyRecord[]> {
    if (names.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).company.findMany({
      where: {
        OR: names.map((name) => ({
          name: {
            equals: name,
            mode: Prisma.QueryMode.insensitive,
          },
        })),
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  create(
    data: {
      name: string;
    },
    db?: DbClient,
  ) {
    return this.getDb(db).company.create({
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
    },
    db?: DbClient,
  ) {
    return this.getDb(db).company.update({
      where: { id },
      data,
      select: {
        id: true,
      },
    });
  }

  private buildWhere(q: string | undefined): Prisma.CompanyWhereInput {
    const where: Prisma.CompanyWhereInput = {};
    const normalizedQ = q?.trim();

    if (normalizedQ) {
      where.name = {
        contains: normalizedQ,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    return where;
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
