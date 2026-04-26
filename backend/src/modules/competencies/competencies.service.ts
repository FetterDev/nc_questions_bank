import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildCompetencySlug,
  normalizeCompetencyName,
  normalizeOptionalDescription,
} from './competency-slug';
import { CompetenciesRepository } from './competencies.repository';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { CreateStackDto } from './dto/create-stack.dto';
import { ListCompetenciesQueryDto } from './dto/list-competencies.query.dto';
import { ListStacksQueryDto } from './dto/list-stacks.query.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { UpdateStackDto } from './dto/update-stack.dto';

@Injectable()
export class CompetenciesService {
  constructor(private readonly competenciesRepository: CompetenciesRepository) {}

  async listStacks(query: ListStacksQueryDto) {
    const startedAt = Date.now();
    const result = await this.competenciesRepository.listStacks({
      q: query.q?.trim() || undefined,
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
        },
      },
    };
  }

  async createStack(dto: CreateStackDto) {
    const name = normalizeCompetencyName(dto.name, 'Stack name');
    const slug = buildCompetencySlug(name);

    try {
      return await this.competenciesRepository.createStack({ name, slug });
    } catch (error) {
      this.rethrowUniqueViolation(error, `Stack with name or slug '${slug}' already exists`);
    }
  }

  async updateStack(id: string, dto: UpdateStackDto) {
    const normalizedId = normalizeId(id, 'id');
    const existing = await this.getExistingStackOrThrow(normalizedId);
    const name = normalizeCompetencyName(dto.name, 'Stack name');
    const slug = buildCompetencySlug(name);

    if (existing.name === name && existing.slug === slug) {
      return existing;
    }

    try {
      return await this.competenciesRepository.updateStack(normalizedId, { name, slug });
    } catch (error) {
      this.rethrowUniqueViolation(error, `Stack with name or slug '${slug}' already exists`);
    }
  }

  async deleteStack(id: string) {
    const normalizedId = normalizeId(id, 'id');
    await this.getExistingStackOrThrow(normalizedId);
    await this.competenciesRepository.deleteStack(normalizedId);
  }

  async listCompetencies(query: ListCompetenciesQueryDto) {
    const startedAt = Date.now();
    const stackId = query.stackId?.trim() || undefined;

    if (stackId) {
      await this.getExistingStackOrThrow(stackId);
    }

    const result = await this.competenciesRepository.listCompetencies({
      q: query.q?.trim() || undefined,
      stackId,
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    });

    return {
      items: result.items,
      total: result.total,
      meta: {
        tookMs: Date.now() - startedAt,
        appliedFilters: {
          q: query.q?.trim() || null,
          stackId: stackId ?? null,
        },
      },
    };
  }

  async createCompetency(dto: CreateCompetencyDto) {
    const stackId = normalizeId(dto.stackId, 'stackId');
    await this.getExistingStackOrThrow(stackId);
    const name = normalizeCompetencyName(dto.name);
    const slug = buildCompetencySlug(name);
    const position = dto.position ?? await this.competenciesRepository.getNextCompetencyPosition(stackId);

    try {
      return await this.competenciesRepository.createCompetency({
        stackId,
        name,
        slug,
        description: normalizeOptionalDescription(dto.description),
        position,
      });
    } catch (error) {
      this.rethrowUniqueViolation(error, `Competency with name or position already exists in stack`);
    }
  }

  async updateCompetency(id: string, dto: UpdateCompetencyDto) {
    const normalizedId = normalizeId(id, 'id');
    const existing = await this.getExistingCompetencyOrThrow(normalizedId);
    const nextStackId = dto.stackId !== undefined
      ? normalizeId(dto.stackId, 'stackId')
      : existing.stackId;

    if (dto.stackId !== undefined) {
      await this.getExistingStackOrThrow(nextStackId);
    }

    const nextName = dto.name !== undefined
      ? normalizeCompetencyName(dto.name)
      : existing.name;
    const nextSlug = buildCompetencySlug(nextName);

    try {
      return await this.competenciesRepository.updateCompetency(normalizedId, {
        stackId: dto.stackId !== undefined ? nextStackId : undefined,
        name: dto.name !== undefined ? nextName : undefined,
        slug: dto.name !== undefined ? nextSlug : undefined,
        description: dto.description !== undefined
          ? normalizeOptionalDescription(dto.description)
          : undefined,
        position: dto.position,
      });
    } catch (error) {
      this.rethrowUniqueViolation(error, `Competency with name or position already exists in stack`);
    }
  }

  async deleteCompetency(id: string) {
    const normalizedId = normalizeId(id, 'id');
    await this.getExistingCompetencyOrThrow(normalizedId);
    await this.competenciesRepository.deleteCompetency(normalizedId);
  }

  async getExistingStackOrThrow(id: string) {
    const stack = await this.competenciesRepository.findStackById(id);

    if (!stack) {
      throw new NotFoundException(`Technology stack with id '${id}' not found`);
    }

    return stack;
  }

  async getExistingCompetencyOrThrow(id: string) {
    const competency = await this.competenciesRepository.findCompetencyById(id);

    if (!competency) {
      throw new NotFoundException(`Competency with id '${id}' not found`);
    }

    return competency;
  }

  private rethrowUniqueViolation(error: unknown, message: string): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}

function normalizeId(value: string | null | undefined, label: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new BadRequestException(`${label} must not be empty`);
  }

  return normalized;
}
