import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

export type UserRecord = {
  id: string;
  login: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, db?: DbClient) {
    return this.getDb(db).user.findUnique({
      where: { id },
    });
  }

  findByIds(ids: string[], db?: DbClient) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(db).user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  findByLogin(login: string, db?: DbClient) {
    return this.getDb(db).user.findUnique({
      where: { login },
    });
  }

  findActiveAdminByLogin(login: string, db?: DbClient) {
    return this.getDb(db).user.findFirst({
      where: {
        login,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  }

  countActiveAdmins(db?: DbClient) {
    return this.getDb(db).user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async list(
    params: {
      q?: string;
      role?: UserRole;
      status?: UserStatus;
      limit: number;
      offset: number;
    },
    db?: DbClient,
  ) {
    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.q) {
      where.OR = [
        {
          login: {
            contains: params.q,
            mode: 'insensitive',
          },
        },
        {
          displayName: {
            contains: params.q,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: params.q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.getDb(db).user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: params.limit,
        skip: params.offset,
      }),
      this.getDb(db).user.count({ where }),
    ]);

    return { items, total };
  }

  create(
    data: {
      login: string;
      passwordHash: string;
      displayName: string;
      email: string | null;
      role: UserRole;
      status?: UserStatus;
      tokenVersion?: number;
    },
    db?: DbClient,
  ) {
    return this.getDb(db).user.create({
      data: {
        login: data.login,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        status: data.status ?? UserStatus.ACTIVE,
        tokenVersion: data.tokenVersion ?? 0,
      },
    });
  }

  update(
    id: string,
    data: {
      displayName?: string;
      email?: string | null;
      role?: UserRole;
      status?: UserStatus;
      passwordHash?: string;
      incrementTokenVersion?: boolean;
    },
    db?: DbClient,
  ) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.passwordHash !== undefined) {
      updateData.passwordHash = data.passwordHash;
    }

    if (data.incrementTokenVersion) {
      updateData.tokenVersion = {
        increment: 1,
      };
    }

    return this.getDb(db).user.update({
      where: { id },
      data: updateData,
    });
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }
}
