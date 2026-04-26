import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CompaniesRepository } from '../companies/companies.repository';
import { CompetenciesRepository } from '../competencies/competencies.repository';
import { UserContext } from '../authz/user-context';
import {
  buildQuestionSnapshot,
  coerceQuestionSnapshot,
  extractCompetencyIdsFromSnapshot,
  extractTopicIdsFromSnapshot,
  normalizeCompetencyIds,
  normalizeQuestionEvaluationCriteria,
  normalizeQuestionPayload,
  normalizeTopicIds,
  QuestionSnapshot,
  QuestionSnapshotCompetency,
  snapshotsEqual,
} from '../questions/question-payload';
import { toDifficultyRank } from '../questions/question-difficulty';
import { QuestionsRepository } from '../questions/questions.repository';
import { CreateQuestionChangeRequestDto } from './dto/create-question-change-request.dto';
import {
  QuestionChangeRequestStatus,
  QuestionChangeRequestType,
  User,
  UserRole,
} from '@prisma/client';
import {
  QuestionChangeRequestRecord,
  QuestionChangeRequestsRepository,
} from './question-change-requests.repository';
import { TopicsRepository } from '../topics/topics.repository';

@Injectable()
export class QuestionChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionsRepository: QuestionsRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly topicsRepository: TopicsRepository,
    private readonly competenciesRepository: CompetenciesRepository,
  ) {}

  async create(
    currentUser: UserContext,
    dto: CreateQuestionChangeRequestDto,
  ) {
    if (dto.type === QuestionChangeRequestType.CREATE) {
      this.ensureMissingTargetQuestionId(dto.targetQuestionId);
      const payload = this.ensurePayload(dto);
      const company = await this.requireCompany(payload.companyId ?? null);
      const competencies = await this.requireCompetencies(payload.competencyIds ?? []);
      const proposed = normalizeQuestionPayload(
        payload,
        await this.requireTopics(payload.topicIds),
        company,
        competencies,
      );

      const created = await this.questionChangeRequestsRepository.create({
        type: dto.type,
        authorId: currentUser.id,
        baseSnapshot: null,
        proposedSnapshot: proposed.snapshot,
      });

      return this.toDetail(created);
    }

    const targetQuestionId = this.ensureTargetQuestionId(dto.targetQuestionId);
    const publishedQuestion = await this.questionsRepository.findOne(targetQuestionId);

    if (!publishedQuestion) {
      throw new NotFoundException(
        `Question with id '${targetQuestionId}' not found`,
      );
    }

    if (
      await this.questionChangeRequestsRepository.hasPendingRequestForQuestion(
        targetQuestionId,
      )
    ) {
      throw new ConflictException(
        `Question with id '${targetQuestionId}' already has pending change request`,
      );
    }

    const baseSnapshot = buildQuestionSnapshot(publishedQuestion);

    if (dto.type === QuestionChangeRequestType.DELETE) {
      this.ensureMissingPayload(dto.payload);

      const created = await this.questionChangeRequestsRepository.create({
        type: dto.type,
        targetQuestionId,
        authorId: currentUser.id,
        baseSnapshot,
        proposedSnapshot: null,
      });

      return this.toDetail(created);
    }

    const payload = this.ensurePayload(dto);
    const company = await this.requireCompany(payload.companyId ?? null);
    const competencies = await this.requireCompetencies(payload.competencyIds ?? []);
    const proposed = normalizeQuestionPayload(
      payload,
      await this.requireTopics(payload.topicIds),
      company,
      competencies,
    );

    if (snapshotsEqual(baseSnapshot, proposed.snapshot)) {
      throw new BadRequestException('Update request must contain actual changes');
    }

    const created = await this.questionChangeRequestsRepository.create({
      type: dto.type,
      targetQuestionId,
      authorId: currentUser.id,
      baseSnapshot,
      proposedSnapshot: proposed.snapshot,
    });

    return this.toDetail(created);
  }

  async listMine(currentUser: UserContext) {
    const rows = await this.questionChangeRequestsRepository.listByAuthor(
      currentUser.id,
    );

    return rows.map((row) => this.toSummary(row));
  }

  async listReviewQueue(_status?: QuestionChangeRequestStatus) {
    const rows = await this.questionChangeRequestsRepository.listPendingForReview();
    return rows.map((row) => this.toSummary(row));
  }

  async findOne(currentUser: UserContext, id: string) {
    const record = await this.getRecord(id);
    this.ensureCanRead(currentUser, record);
    return this.toDetail(record);
  }

  async approve(currentUser: UserContext, id: string) {
    const record = await this.getPendingRecord(id);

    const approved = await this.prisma.$transaction(async (tx) => {
      const before = this.getSnapshot(record.baseSnapshot);
      const after = this.getSnapshot(record.proposedSnapshot);

      if (record.type === QuestionChangeRequestType.CREATE) {
        if (!after) {
          throw new ConflictException('Create request payload is missing');
        }

        const topicIds = await this.resolveSnapshotTopicIds(after, tx);
        const companyId = await this.resolveSnapshotCompanyId(after, tx);
        const competencyIds = await this.resolveSnapshotCompetencyIds(after, tx);
        await this.questionsRepository.create(
          {
            text: after.text,
            textContent: after.textContent,
            answer: after.answer,
            answerContent: after.answerContent,
            difficulty: toDifficultyRank(after.difficulty),
            companyId,
            topicIds,
            competencyIds,
            evaluationCriteria: this.toQuestionCriteriaWritePayload(after),
          },
          tx,
        );
      }

      if (record.type === QuestionChangeRequestType.UPDATE) {
        const targetQuestionId = this.ensureTargetQuestionId(record.targetQuestionId);
        if (!before || !after) {
          throw new ConflictException('Update request snapshots are corrupted');
        }

        const currentQuestion = await this.questionsRepository.findOne(
          targetQuestionId,
          tx,
        );

        if (!currentQuestion) {
          throw new ConflictException('Published question is missing');
        }

        if (!snapshotsEqual(buildQuestionSnapshot(currentQuestion), before)) {
          throw new ConflictException(
            'Published question changed after request creation',
          );
        }

        const topicIds = await this.resolveSnapshotTopicIds(after, tx);
        const companyId = await this.resolveSnapshotCompanyId(after, tx);
        const competencyIds = await this.resolveSnapshotCompetencyIds(after, tx);
        await this.questionsRepository.update(
          targetQuestionId,
          {
            text: after.text,
            textContent: after.textContent,
            answer: after.answer,
            answerContent: after.answerContent,
            difficulty: toDifficultyRank(after.difficulty),
            companyId,
            topicIds,
            competencyIds,
            evaluationCriteria: this.toQuestionCriteriaWritePayload(after),
          },
          tx,
        );
      }

      if (record.type === QuestionChangeRequestType.DELETE) {
        const targetQuestionId = this.ensureTargetQuestionId(record.targetQuestionId);
        if (!before) {
          throw new ConflictException('Delete request snapshot is missing');
        }

        const currentQuestion = await this.questionsRepository.findOne(
          targetQuestionId,
          tx,
        );

        if (!currentQuestion) {
          throw new ConflictException('Published question is missing');
        }

        if (!snapshotsEqual(buildQuestionSnapshot(currentQuestion), before)) {
          throw new ConflictException(
            'Published question changed after request creation',
          );
        }

        await this.questionsRepository.remove(targetQuestionId, tx);
      }

      return this.questionChangeRequestsRepository.markApproved(
        record.id,
        currentUser.id,
        tx,
      );
    });

    return this.toDetail(approved);
  }

  async reject(currentUser: UserContext, id: string, reviewComment: string) {
    const record = await this.getPendingRecord(id);
    const normalizedComment = reviewComment.trim();

    if (!normalizedComment) {
      throw new BadRequestException('Reject review comment cannot be empty');
    }

    const rejected = await this.questionChangeRequestsRepository.markRejected(
      record.id,
      currentUser.id,
      normalizedComment,
    );

    return this.toDetail(rejected);
  }

  private async getRecord(id: string) {
    const record = await this.questionChangeRequestsRepository.findOne(id);

    if (!record) {
      throw new NotFoundException(
        `Question change request with id '${id}' not found`,
      );
    }

    return record;
  }

  private async getPendingRecord(id: string) {
    const record = await this.getRecord(id);

    if (record.status !== QuestionChangeRequestStatus.PENDING) {
      throw new ConflictException(
        `Question change request with id '${id}' is already reviewed`,
      );
    }

    return record;
  }

  private ensureCanRead(currentUser: UserContext, record: QuestionChangeRequestRecord) {
    if (currentUser.role === UserRole.MANAGER) {
      return;
    }

    if (currentUser.role === UserRole.USER && record.authorId === currentUser.id) {
      return;
    }

    throw new ForbiddenException('Access to this change request is denied');
  }

  private ensurePayload(dto: CreateQuestionChangeRequestDto) {
    if (!dto.payload) {
      throw new BadRequestException('Payload is required for this request type');
    }

    return dto.payload;
  }

  private ensureMissingPayload(
    payload: CreateQuestionChangeRequestDto['payload'],
  ) {
    if (payload !== undefined) {
      throw new BadRequestException('Payload is not allowed for delete request');
    }
  }

  private ensureTargetQuestionId(targetQuestionId?: string | null) {
    if (!targetQuestionId?.trim()) {
      throw new BadRequestException('targetQuestionId is required');
    }

    return targetQuestionId.trim();
  }

  private ensureMissingTargetQuestionId(targetQuestionId?: string | null) {
    if (targetQuestionId?.trim()) {
      throw new BadRequestException(
        'targetQuestionId is not allowed for create request',
      );
    }
  }

  private toSummary(record: QuestionChangeRequestRecord) {
    const before = coerceQuestionSnapshot(record.baseSnapshot);
    const after = coerceQuestionSnapshot(record.proposedSnapshot);

    return {
      id: record.id,
      type: record.type,
      status: record.status,
      targetQuestionId: record.targetQuestionId,
      subject: after?.text ?? before?.text ?? 'Без названия',
      author: this.toActor(record.author),
      reviewer: record.reviewer ? this.toActor(record.reviewer) : null,
      reviewComment: record.reviewComment,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      reviewedAt: record.reviewedAt,
    };
  }

  private toDetail(record: QuestionChangeRequestRecord) {
    const before = coerceQuestionSnapshot(record.baseSnapshot);
    const after = coerceQuestionSnapshot(record.proposedSnapshot);

    return {
      ...this.toSummary(record),
      before,
      after,
      fieldDiffs: {
        text: {
          changed: before?.text !== after?.text,
          before: before?.text ?? null,
          after: after?.text ?? null,
        },
        answer: {
          changed: before?.answer !== after?.answer,
          before: before?.answer ?? null,
          after: after?.answer ?? null,
        },
        difficulty: {
          changed: before?.difficulty !== after?.difficulty,
          before: before?.difficulty ?? null,
          after: after?.difficulty ?? null,
        },
        company: {
          changed:
            (before?.company?.id ?? before?.company?.name ?? null) !==
            (after?.company?.id ?? after?.company?.name ?? null),
          before: before?.company ?? null,
          after: after?.company ?? null,
        },
        topics: this.buildTopicsDiff(before, after),
        competencies: this.buildCompetenciesDiff(before, after),
        evaluationCriteria: this.buildEvaluationCriteriaDiff(before, after),
      },
    };
  }

  private buildTopicsDiff(
    before: QuestionSnapshot | null,
    after: QuestionSnapshot | null,
  ) {
    const beforeTopics = before?.topics ?? [];
    const afterTopics = after?.topics ?? [];
    const beforeMap = new Map(beforeTopics.map((topic) => [topic.slug, topic]));
    const afterMap = new Map(afterTopics.map((topic) => [topic.slug, topic]));

    return {
      changed:
        beforeTopics.length !== afterTopics.length ||
        beforeTopics.some((topic) => !afterMap.has(topic.slug)) ||
        afterTopics.some((topic) => !beforeMap.has(topic.slug)),
      before: beforeTopics,
      after: afterTopics,
      added: afterTopics.filter((topic) => !beforeMap.has(topic.slug)),
      removed: beforeTopics.filter((topic) => !afterMap.has(topic.slug)),
    };
  }

  private buildCompetenciesDiff(
    before: QuestionSnapshot | null,
    after: QuestionSnapshot | null,
  ) {
    const beforeCompetencies = before?.competencies ?? [];
    const afterCompetencies = after?.competencies ?? [];
    const beforeMap = new Map(beforeCompetencies.map((item) => [item.id, item]));
    const afterMap = new Map(afterCompetencies.map((item) => [item.id, item]));

    return {
      changed:
        beforeCompetencies.length !== afterCompetencies.length ||
        beforeCompetencies.some((item) => !afterMap.has(item.id)) ||
        afterCompetencies.some((item) => !beforeMap.has(item.id)),
      before: beforeCompetencies,
      after: afterCompetencies,
      added: afterCompetencies.filter((item) => !beforeMap.has(item.id)),
      removed: beforeCompetencies.filter((item) => !afterMap.has(item.id)),
    };
  }

  private buildEvaluationCriteriaDiff(
    before: QuestionSnapshot | null,
    after: QuestionSnapshot | null,
  ) {
    const beforeCriteria = before?.evaluationCriteria ?? [];
    const afterCriteria = after?.evaluationCriteria ?? [];

    return {
      changed: JSON.stringify(beforeCriteria) !== JSON.stringify(afterCriteria),
      before: beforeCriteria,
      after: afterCriteria,
    };
  }

  private toActor(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  private getSnapshot(value: unknown): QuestionSnapshot | null {
    return coerceQuestionSnapshot(value);
  }

  private async requireTopics(topicIds: string[]) {
    const normalizedTopicIds = normalizeTopicIds(topicIds);
    const topics = await this.topicsRepository.findByIds(normalizedTopicIds);

    if (topics.length !== normalizedTopicIds.length) {
      throw new BadRequestException('Some topics do not exist');
    }

    const topicsById = new Map(topics.map((topic) => [topic.id, topic]));

    return normalizedTopicIds.map((topicId) => {
      const topic = topicsById.get(topicId);

      if (!topic) {
        throw new BadRequestException('Some topics do not exist');
      }

      return topic;
    });
  }

  private async requireCompany(companyId: string | null | undefined) {
    if (companyId === undefined || companyId === null) {
      return null;
    }

    const normalizedCompanyId = companyId.trim();

    if (!normalizedCompanyId) {
      throw new BadRequestException('Question company is invalid');
    }

    const company = await this.companiesRepository.findById(normalizedCompanyId);

    if (!company) {
      throw new BadRequestException('Question company is invalid');
    }

    return {
      id: company.id,
      name: company.name,
    };
  }

  private async requireCompetencies(
    competencyIds: string[],
  ): Promise<QuestionSnapshotCompetency[]> {
    const normalizedCompetencyIds = normalizeCompetencyIds(competencyIds);

    if (normalizedCompetencyIds.length === 0) {
      return [];
    }

    const competencies = await this.competenciesRepository.findCompetenciesByIds(
      normalizedCompetencyIds,
    );

    if (competencies.length !== normalizedCompetencyIds.length) {
      throw new BadRequestException('Some competencies do not exist');
    }

    const competenciesById = new Map(competencies.map((competency) => [competency.id, competency]));

    return normalizedCompetencyIds.map((competencyId) => {
      const competency = competenciesById.get(competencyId);

      if (!competency) {
        throw new BadRequestException('Some competencies do not exist');
      }

      return {
        id: competency.id,
        name: competency.name,
        slug: competency.slug,
        stack: {
          id: competency.stack.id,
          name: competency.stack.name,
          slug: competency.stack.slug,
        },
      };
    });
  }

  private async resolveSnapshotTopicIds(
    snapshot: QuestionSnapshot,
    db: Parameters<QuestionsRepository['create']>[1],
  ) {
    const directTopicIds = extractTopicIdsFromSnapshot(snapshot);

    if (directTopicIds) {
      const topics = await this.topicsRepository.findByIds(directTopicIds, db);

      if (topics.length !== directTopicIds.length) {
        throw new ConflictException('Request topics are outdated');
      }

      return directTopicIds;
    }

    const topics = await this.topicsRepository.resolveSnapshotTopics(
      snapshot.topics,
      db,
    );

    if (topics.some((topic) => topic === null)) {
      throw new ConflictException('Request topics are outdated');
    }

    return topics.map((topic) => {
      if (!topic) {
        throw new ConflictException('Request topics are outdated');
      }

      return topic.id;
    });
  }

  private async resolveSnapshotCompanyId(
    snapshot: QuestionSnapshot,
    db: Parameters<QuestionsRepository['create']>[1],
  ) {
    if (!snapshot.company) {
      return null;
    }

    const snapshotCompanyId = snapshot.company.id.trim();

    if (snapshotCompanyId) {
      const company = await this.companiesRepository.findById(snapshotCompanyId, db);

      if (company) {
        return company.id;
      }
    }

    const company = await this.companiesRepository.findByNameInsensitive(
      snapshot.company.name,
      db,
    );

    if (!company) {
      throw new ConflictException('Request company is outdated');
    }

    return company.id;
  }

  private async resolveSnapshotCompetencyIds(
    snapshot: QuestionSnapshot,
    db: Parameters<QuestionsRepository['create']>[1],
  ) {
    const competencyIds = extractCompetencyIdsFromSnapshot(snapshot);

    if (competencyIds.length === 0) {
      return [];
    }

    const competencies = await this.competenciesRepository.findCompetenciesByIds(
      competencyIds,
      db,
    );

    if (competencies.length !== competencyIds.length) {
      throw new ConflictException('Request competencies are outdated');
    }

    return competencyIds;
  }

  private toQuestionCriteriaWritePayload(snapshot: QuestionSnapshot) {
    return normalizeQuestionEvaluationCriteria(
      snapshot.evaluationCriteria.map((criterion) => ({
        title: criterion.title,
        description: criterion.description,
        weight: criterion.weight,
        competencyId: criterion.competency?.id ?? null,
      })),
      snapshot.competencies,
    ).map((criterion) => ({
      title: criterion.title,
      description: criterion.description,
      weight: criterion.weight,
      position: criterion.position,
      competencyId: criterion.competency?.id ?? null,
    }));
  }
}
