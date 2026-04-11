import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly shouldConnect: boolean;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const skipConnect = process.env.PRISMA_SKIP_CONNECT === 'true';
    const fallbackConnectionString =
      'postgresql://postgres:postgres@localhost:5432/postgres?schema=public';
    const effectiveConnectionString =
      connectionString ?? (skipConnect ? fallbackConnectionString : undefined);
    if (effectiveConnectionString) {
      const adapter = new PrismaPg({
        connectionString: effectiveConnectionString,
      });
      super({ adapter });
      this.shouldConnect = !skipConnect;
      return;
    }

    throw new Error('DATABASE_URL is not set');
  }

  async onModuleInit() {
    if (!this.shouldConnect) {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    if (!this.shouldConnect) {
      return;
    }

    await this.$disconnect();
  }
}
