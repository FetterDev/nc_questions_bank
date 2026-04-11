import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QuestionChangeRequestsRepository } from '../question-change-requests/question-change-requests.repository';
import { normalizeCompanyName } from './company-name';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompaniesRepository } from './companies.repository';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesRepository: CompaniesRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
  ) {}

  async list(query: ListCompaniesQueryDto) {
    const startedAt = Date.now();
    const result = await this.companiesRepository.list({
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

  async create(dto: CreateCompanyDto) {
    const name = normalizeCompanyName(dto.name);
    await this.ensureNameAvailable(name);

    const created = await this.companiesRepository.create({ name });
    return this.getExistingCompanyOrThrow(created.id);
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const existing = await this.getExistingCompanyOrThrow(id);
    const name = normalizeCompanyName(dto.name);

    if (existing.name === name) {
      return existing;
    }

    await this.ensureNameAvailable(name, existing.id);

    await this.prisma.$transaction(async (tx) => {
      await this.companiesRepository.update(id, { name }, tx);
      await this.questionChangeRequestsRepository.syncCompanyInSnapshots(
        {
          id: existing.id,
          name: existing.name,
        },
        {
          id: existing.id,
          name,
        },
        tx,
      );
    });

    return this.getExistingCompanyOrThrow(id);
  }

  private async getExistingCompanyOrThrow(id: string) {
    const existing = await this.companiesRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Company with id '${id}' not found`);
    }

    return existing;
  }

  private async ensureNameAvailable(name: string, excludedId?: string) {
    const duplicate = await this.companiesRepository.findByNameInsensitive(name);

    if (duplicate && duplicate.id !== excludedId) {
      throw new ConflictException(`Company with name '${name}' already exists`);
    }
  }
}
