import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingSessionResultMark, UserRole, UserStatus } from '@prisma/client';
import { fromTrainingResultDb, isCorrectTrainingResult, isPartialTrainingResult } from '../training/training-result';
import {
  CompetencyMatrixCompetencyRecord,
  CompetencyMatrixCriterionResultRecord,
  CompetencyMatrixRepository,
  CompetencyMatrixUserRecord,
} from './competency-matrix.repository';
import { ListCompetencyMatrixQueryDto } from './dto/list-competency-matrix.query.dto';
import { UserContext } from '../authz/user-context';

type MatrixCompetencyStats = {
  competency: CompetencyMatrixCompetencyRecord;
  totalCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  lastResult: TrainingSessionResultMark | null;
  lastAssessedAt: Date | null;
};

@Injectable()
export class CompetencyMatrixService {
  constructor(private readonly repository: CompetencyMatrixRepository) {}

  async getMyMatrix(currentUser: UserContext) {
    const user = await this.requireActiveUser(currentUser.id);
    return this.buildUserMatrix(user);
  }

  async getUserMatrix(userId: string) {
    const user = await this.requireActiveUser(normalizeRequiredId(userId, 'userId'));
    return this.buildUserMatrix(user);
  }

  async listMatrix(query: ListCompetencyMatrixQueryDto) {
    const stackId = normalizeOptionalId(query.stackId);
    const users = await this.repository.listUsers({ stackId });
    const [assignedCompetencies, criteriaResults] = await this.loadMatrixInputs(
      users,
      stackId,
    );

    return {
      items: users.map((user) =>
        this.toUserMatrixResponse(
          user,
          assignedCompetencies,
          criteriaResults.filter((item) => item.userId === user.id),
          stackId,
        ),
      ),
    };
  }

  private async requireActiveUser(userId: string) {
    const user = await this.repository.findUserById(userId);

    if (!user || user.role !== UserRole.USER || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException(`Active user with id '${userId}' not found`);
    }

    return user;
  }

  private async buildUserMatrix(user: CompetencyMatrixUserRecord, stackId?: string) {
    const [assignedCompetencies, criteriaResults] = await this.loadMatrixInputs(
      [user],
      stackId,
    );

    return this.toUserMatrixResponse(user, assignedCompetencies, criteriaResults, stackId);
  }

  private async loadMatrixInputs(
    users: CompetencyMatrixUserRecord[],
    stackId?: string,
  ) {
    const userIds = users.map((user) => user.id);
    const assignedStackIds = stackId
      ? [stackId]
      : [
          ...new Set(
            users.flatMap((user) => user.stacks.map((userStack) => userStack.stackId)),
          ),
        ];
    const [assignedCompetencies, criteriaResults] = await Promise.all([
      this.repository.listCompetenciesForStacks(assignedStackIds),
      this.repository.listCompletedCriterionResultsForUsers(userIds),
    ]);
    const resultCompetencies = await this.repository.listCompetenciesByIds(
      criteriaResults.map((item) => item.competencyId),
    );
    const resultCompetencyIds = new Set(assignedCompetencies.map((item) => item.id));
    const competencies = [
      ...assignedCompetencies,
      ...resultCompetencies.filter((item) => !resultCompetencyIds.has(item.id)),
    ].filter((item) => !stackId || item.stackId === stackId);
    const competencyIds = new Set(competencies.map((item) => item.id));

    return [
      competencies,
      criteriaResults.filter((item) => competencyIds.has(item.competencyId)),
    ] as const;
  }

  private toUserMatrixResponse(
    user: CompetencyMatrixUserRecord,
    competencies: CompetencyMatrixCompetencyRecord[],
    criteriaResults: CompetencyMatrixCriterionResultRecord[],
    stackId?: string,
  ) {
    const stackIds = stackId
      ? new Set([stackId])
      : new Set(user.stacks.map((item) => item.stackId));

    return {
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
      },
      stacks: user.stacks
        .filter((item) => stackIds.has(item.stackId))
        .map((item) => ({
          id: item.stack.id,
          name: item.stack.name,
          slug: item.stack.slug,
        })),
      competencies: this.aggregateCompetencies(competencies, criteriaResults),
    };
  }

  private aggregateCompetencies(
    competencies: CompetencyMatrixCompetencyRecord[],
    criteriaResults: CompetencyMatrixCriterionResultRecord[],
  ) {
    const statsByCompetency = new Map<string, MatrixCompetencyStats>();

    for (const competency of competencies) {
      statsByCompetency.set(competency.id, {
        competency,
        totalCount: 0,
        correctCount: 0,
        partialCount: 0,
        incorrectCount: 0,
        lastResult: null,
        lastAssessedAt: null,
      });
    }

    for (const result of criteriaResults) {
      const stats = statsByCompetency.get(result.competencyId);

      if (!stats) {
        continue;
      }

      const weight = Math.max(1, result.weight);
      stats.totalCount += weight;

      if (isCorrectTrainingResult(fromTrainingResultDb(result.result))) {
        stats.correctCount += weight;
      } else if (isPartialTrainingResult(fromTrainingResultDb(result.result))) {
        stats.partialCount += weight;
      } else {
        stats.incorrectCount += weight;
      }

      if (!stats.lastAssessedAt || result.assessedAt.getTime() > stats.lastAssessedAt.getTime()) {
        stats.lastResult = result.result;
        stats.lastAssessedAt = result.assessedAt;
      }
    }

    return [...statsByCompetency.values()]
      .map((stats) => ({
        id: stats.competency.id,
        stack: {
          id: stats.competency.stack.id,
          name: stats.competency.stack.name,
          slug: stats.competency.stack.slug,
        },
        name: stats.competency.name,
        slug: stats.competency.slug,
        description: stats.competency.description,
        position: stats.competency.position,
        totalCount: stats.totalCount,
        correctCount: stats.correctCount,
        partialCount: stats.partialCount,
        incorrectCount: stats.incorrectCount,
        accuracy: toPercent(stats.correctCount, stats.totalCount),
        lastResult: stats.lastResult ? fromTrainingResultDb(stats.lastResult) : null,
        lastAssessedAt: stats.lastAssessedAt?.toISOString() ?? null,
      }))
      .sort(
        (left, right) =>
          left.stack.name.localeCompare(right.stack.name, 'ru-RU') ||
          left.position - right.position ||
          left.name.localeCompare(right.name, 'ru-RU') ||
          left.id.localeCompare(right.id, 'ru-RU'),
      );
  }
}

function normalizeRequiredId(value: string | null | undefined, fieldLabel: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} must not be empty`);
  }

  return normalized;
}

function normalizeOptionalId(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
