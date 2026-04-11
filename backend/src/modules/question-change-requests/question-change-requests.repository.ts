import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  QuestionChangeRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  coerceQuestionSnapshot,
  isLegacyTopicId,
  QuestionSnapshotCompany,
  QuestionSnapshot,
  toJsonSnapshot,
  toLegacyTopicId,
} from '../questions/question-payload';

type DbClient = Prisma.TransactionClient | PrismaClient | PrismaService;

export type QuestionChangeRequestRecord =
  Prisma.QuestionChangeRequestGetPayload<{
    include: {
      author: true;
      reviewer: true;
    };
  }>;

export type PendingQuestionState = {
  hasPendingChangeRequest: boolean;
  hasMyPendingChangeRequest: boolean;
};

@Injectable()
export class QuestionChangeRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: {
      type: Prisma.QuestionChangeRequestCreateInput['type'];
      targetQuestionId?: string | null;
      authorId: string;
      baseSnapshot: QuestionSnapshot | null;
      proposedSnapshot: QuestionSnapshot | null;
    },
    db?: DbClient,
  ) {
    return this.getDb(db).questionChangeRequest.create({
      data: {
        type: data.type,
        targetQuestionId: data.targetQuestionId ?? null,
        authorId: data.authorId,
        baseSnapshot: toJsonSnapshot(data.baseSnapshot),
        proposedSnapshot: toJsonSnapshot(data.proposedSnapshot),
      },
      include: {
        author: true,
        reviewer: true,
      },
    });
  }

  findOne(id: string, db?: DbClient) {
    return this.getDb(db).questionChangeRequest.findUnique({
      where: { id },
      include: {
        author: true,
        reviewer: true,
      },
    });
  }

  listByAuthor(authorId: string) {
    return this.prisma.questionChangeRequest.findMany({
      where: { authorId },
      include: {
        author: true,
        reviewer: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  listPendingForReview() {
    return this.prisma.questionChangeRequest.findMany({
      where: {
        status: QuestionChangeRequestStatus.PENDING,
      },
      include: {
        author: true,
        reviewer: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async hasPendingRequestForQuestion(questionId: string, db?: DbClient) {
    const found = await this.getDb(db).questionChangeRequest.findFirst({
      where: {
        targetQuestionId: questionId,
        status: QuestionChangeRequestStatus.PENDING,
      },
      select: { id: true },
    });

    return Boolean(found);
  }

  async getPendingStatesForQuestions(questionIds: string[], viewerId: string) {
    if (questionIds.length === 0) {
      return new Map<string, PendingQuestionState>();
    }

    const rows = await this.prisma.questionChangeRequest.findMany({
      where: {
        targetQuestionId: {
          in: questionIds,
        },
        status: QuestionChangeRequestStatus.PENDING,
      },
      select: {
        targetQuestionId: true,
        authorId: true,
      },
    });

    const states = new Map<string, PendingQuestionState>();

    for (const questionId of questionIds) {
      states.set(questionId, {
        hasPendingChangeRequest: false,
        hasMyPendingChangeRequest: false,
      });
    }

    for (const row of rows) {
      if (!row.targetQuestionId) {
        continue;
      }

      states.set(row.targetQuestionId, {
        hasPendingChangeRequest: true,
        hasMyPendingChangeRequest: row.authorId === viewerId,
      });
    }

    return states;
  }

  markApproved(
    id: string,
    reviewerId: string,
    db?: DbClient,
  ): Promise<QuestionChangeRequestRecord> {
    return this.getDb(db).questionChangeRequest.update({
      where: { id },
      data: {
        status: QuestionChangeRequestStatus.APPROVED,
        reviewerId,
        reviewedAt: new Date(),
        reviewComment: null,
      },
      include: {
        author: true,
        reviewer: true,
      },
    });
  }

  markRejected(
    id: string,
    reviewerId: string,
    reviewComment: string,
    db?: DbClient,
  ): Promise<QuestionChangeRequestRecord> {
    return this.getDb(db).questionChangeRequest.update({
      where: { id },
      data: {
        status: QuestionChangeRequestStatus.REJECTED,
        reviewerId,
        reviewedAt: new Date(),
        reviewComment,
      },
      include: {
        author: true,
        reviewer: true,
      },
    });
  }

  async syncTopicInSnapshots(
    beforeTopic: {
      id: string;
      name: string;
      slug: string;
    },
    afterTopic: {
      id: string;
      name: string;
      slug: string;
    },
    db?: DbClient,
  ) {
    const client = this.getDb(db);
    const rows = await client.questionChangeRequest.findMany({
      select: {
        id: true,
        baseSnapshot: true,
        proposedSnapshot: true,
      },
    });

    for (const row of rows) {
      const baseSnapshot = coerceQuestionSnapshot(row.baseSnapshot);
      const proposedSnapshot = coerceQuestionSnapshot(row.proposedSnapshot);
      const nextBaseSnapshot = this.replaceTopicInSnapshot(
        baseSnapshot,
        beforeTopic,
        afterTopic,
      );
      const nextProposedSnapshot = this.replaceTopicInSnapshot(
        proposedSnapshot,
        beforeTopic,
        afterTopic,
      );

      if (
        JSON.stringify(baseSnapshot) === JSON.stringify(nextBaseSnapshot) &&
        JSON.stringify(proposedSnapshot) === JSON.stringify(nextProposedSnapshot)
      ) {
        continue;
      }

      await client.questionChangeRequest.update({
        where: { id: row.id },
        data: {
          baseSnapshot: toJsonSnapshot(nextBaseSnapshot),
          proposedSnapshot: toJsonSnapshot(nextProposedSnapshot),
        },
      });
    }
  }

  async syncCompanyInSnapshots(
    beforeCompany: QuestionSnapshotCompany,
    afterCompany: QuestionSnapshotCompany,
    db?: DbClient,
  ) {
    const client = this.getDb(db);
    const rows = await client.questionChangeRequest.findMany({
      select: {
        id: true,
        baseSnapshot: true,
        proposedSnapshot: true,
      },
    });

    for (const row of rows) {
      const baseSnapshot = coerceQuestionSnapshot(row.baseSnapshot);
      const proposedSnapshot = coerceQuestionSnapshot(row.proposedSnapshot);
      const nextBaseSnapshot = this.replaceCompanyInSnapshot(
        baseSnapshot,
        beforeCompany,
        afterCompany,
      );
      const nextProposedSnapshot = this.replaceCompanyInSnapshot(
        proposedSnapshot,
        beforeCompany,
        afterCompany,
      );

      if (
        JSON.stringify(baseSnapshot) === JSON.stringify(nextBaseSnapshot) &&
        JSON.stringify(proposedSnapshot) === JSON.stringify(nextProposedSnapshot)
      ) {
        continue;
      }

      await client.questionChangeRequest.update({
        where: { id: row.id },
        data: {
          baseSnapshot: toJsonSnapshot(nextBaseSnapshot),
          proposedSnapshot: toJsonSnapshot(nextProposedSnapshot),
        },
      });
    }
  }

  private getDb(db?: DbClient) {
    return db ?? this.prisma;
  }

  private replaceTopicInSnapshot(
    snapshot: QuestionSnapshot | null,
    beforeTopic: {
      id: string;
      name: string;
      slug: string;
    },
    afterTopic: {
      id: string;
      name: string;
      slug: string;
    },
  ) {
    if (!snapshot) {
      return snapshot;
    }

    const nextTopics = snapshot.topics.map((topic) => {
      const matchesById = topic.id === beforeTopic.id;
      const matchesLegacyId = topic.id === toLegacyTopicId(beforeTopic.slug);
      const matchesLegacyShape =
        isLegacyTopicId(topic.id) &&
        (topic.slug === beforeTopic.slug ||
          topic.name.trim().toLocaleLowerCase('ru-RU') ===
            beforeTopic.name.trim().toLocaleLowerCase('ru-RU'));

      if (!matchesById && !matchesLegacyId && !matchesLegacyShape) {
        return topic;
      }

      return {
        id: afterTopic.id,
        name: afterTopic.name,
        slug: afterTopic.slug,
      };
    });

    return {
      ...snapshot,
      topics: nextTopics.sort((left, right) =>
        left.slug.localeCompare(right.slug, 'ru-RU'),
      ),
    };
  }

  private replaceCompanyInSnapshot(
    snapshot: QuestionSnapshot | null,
    beforeCompany: QuestionSnapshotCompany,
    afterCompany: QuestionSnapshotCompany,
  ) {
    if (!snapshot?.company) {
      return snapshot;
    }

    const snapshotName = snapshot.company.name.trim().toLocaleLowerCase('ru-RU');
    const beforeName = beforeCompany.name.trim().toLocaleLowerCase('ru-RU');
    const matchesById =
      snapshot.company.id &&
      beforeCompany.id &&
      snapshot.company.id === beforeCompany.id;
    const matchesByName = snapshotName === beforeName;

    if (!matchesById && !matchesByName) {
      return snapshot;
    }

    return {
      ...snapshot,
      company: {
        id: afterCompany.id,
        name: afterCompany.name,
      },
    };
  }
}
