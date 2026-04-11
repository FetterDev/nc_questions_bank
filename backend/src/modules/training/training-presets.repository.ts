import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

type TrainingPresetRecord = Prisma.TrainingPresetGetPayload<{
  include: {
    topics: {
      include: {
        topic: true;
      };
    };
  };
}>;

export type TrainingPresetOutput = {
  id: string;
  name: string;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TrainingPresetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(db?: DbClient): Promise<TrainingPresetOutput[]> {
    const items = await this.getDb(db).trainingPreset.findMany({
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return items.map((item) => this.mapPreset(item));
  }

  async findById(id: string, db?: DbClient): Promise<TrainingPresetOutput | null> {
    const item = await this.getDb(db).trainingPreset.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });

    return item ? this.mapPreset(item) : null;
  }

  async create(
    data: {
      name: string;
      topicIds: string[];
    },
    db?: DbClient,
  ): Promise<TrainingPresetOutput> {
    const created = await this.getDb(db).trainingPreset.create({
      data: {
        name: data.name,
        topics: {
          create: data.topicIds.map((topicId, index) => ({
            topic: {
              connect: { id: topicId },
            },
            position: index,
          })),
        },
      },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });

    return this.mapPreset(created);
  }

  async update(
    id: string,
    data: {
      name: string;
      topicIds: string[];
    },
    db?: DbClient,
  ): Promise<TrainingPresetOutput> {
    const updated = await this.getDb(db).trainingPreset.update({
      where: { id },
      data: {
        name: data.name,
        topics: {
          deleteMany: {},
          create: data.topicIds.map((topicId, index) => ({
            topic: {
              connect: { id: topicId },
            },
            position: index,
          })),
        },
      },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });

    return this.mapPreset(updated);
  }

  async remove(id: string, db?: DbClient): Promise<void> {
    await this.getDb(db).trainingPreset.delete({
      where: { id },
    });
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }

  private mapPreset(preset: TrainingPresetRecord): TrainingPresetOutput {
    return {
      id: preset.id,
      name: preset.name,
      topics: [...preset.topics]
        .sort((left, right) => left.position - right.position)
        .map((item) => ({
          id: item.topic.id,
          name: item.topic.name,
          slug: item.topic.slug,
        })),
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    };
  }
}
