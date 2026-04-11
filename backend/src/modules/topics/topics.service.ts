import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QuestionChangeRequestsRepository } from '../question-change-requests/question-change-requests.repository';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ListTopicsQueryDto } from './dto/list-topics.query.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { buildTopicSlug, normalizeTopicName } from './topic-slug';
import { TopicsRepository } from './topics.repository';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly topicsRepository: TopicsRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
  ) {}

  async list(query: ListTopicsQueryDto) {
    const startedAt = Date.now();
    const result = await this.topicsRepository.list({
      q: query.q?.trim() || undefined,
      usedOnly: query.usedOnly ?? false,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    return {
      items: result.items,
      total: result.total,
      meta: {
        tookMs: Date.now() - startedAt,
        appliedFilters: {
          q: query.q?.trim() || null,
          usedOnly: query.usedOnly ?? false,
        },
      },
    };
  }

  async create(dto: CreateTopicDto) {
    const name = normalizeTopicName(dto.name);
    const slug = buildTopicSlug(name);

    try {
      const created = await this.topicsRepository.create({ name, slug });
      return this.getExistingTopicOrThrow(created.id);
    } catch (error) {
      this.rethrowUniqueViolation(error, slug);
    }
  }

  async update(id: string, dto: UpdateTopicDto) {
    const existing = await this.getExistingTopicOrThrow(id);
    const name = normalizeTopicName(dto.name);
    const slug = buildTopicSlug(name);

    if (existing.name === name && existing.slug === slug) {
      return existing;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.topicsRepository.update(id, { name, slug }, tx);
        await this.questionChangeRequestsRepository.syncTopicInSnapshots(
          {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
          },
          {
            id: existing.id,
            name,
            slug,
          },
          tx,
        );
      });
    } catch (error) {
      this.rethrowUniqueViolation(error, slug);
    }

    return this.getExistingTopicOrThrow(id);
  }

  private async getExistingTopicOrThrow(id: string) {
    const existing = await this.topicsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Topic with id '${id}' not found`);
    }

    return existing;
  }

  private rethrowUniqueViolation(error: unknown, slug: string): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `Topic with name or slug '${slug}' already exists`,
      );
    }

    throw error;
  }
}
