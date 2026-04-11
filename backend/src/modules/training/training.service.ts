import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TrainingSessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UserContext } from '../authz/user-context';
import { normalizeTopicIds } from '../questions/question-payload';
import {
  DEFAULT_SELECTION_QUESTIONS_PER_TOPIC,
  QuestionSelectionRepository,
} from '../questions/question-selection.repository';
import { toDifficultyRank } from '../questions/question-difficulty';
import { QuestionsRepository } from '../questions/questions.repository';
import { TopicsRepository } from '../topics/topics.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateTrainingPresetDto } from './dto/create-training-preset.dto';
import { PrepareTrainingDto } from './dto/prepare-training.dto';
import { SaveTrainingResultsDto } from './dto/save-training-results.dto';
import { UpdateTrainingPresetDto } from './dto/update-training-preset.dto';
import { TrainingPresetsRepository } from './training-presets.repository';
import { TrainingRepository } from './training.repository';
import {
  isCorrectTrainingResult,
  isIncorrectTrainingResult,
  isPartialTrainingResult,
} from './training-result';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly topicsRepository: TopicsRepository,
    private readonly questionsRepository: QuestionsRepository,
    private readonly questionSelectionRepository: QuestionSelectionRepository,
    private readonly usersRepository: UsersRepository,
    private readonly trainingPresetsRepository: TrainingPresetsRepository,
    private readonly trainingRepository: TrainingRepository,
  ) {}

  listPresets() {
    return this.trainingPresetsRepository.listAll();
  }

  async listParticipants(currentUser: UserContext) {
    const result = await this.usersRepository.list({
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      limit: 200,
      offset: 0,
    });

    return {
      items: result.items
        .filter((item) => item.id !== currentUser.id)
        .sort(
          (left, right) =>
            left.displayName.localeCompare(right.displayName, 'ru-RU') ||
            left.login.localeCompare(right.login, 'ru-RU'),
        )
        .map((item) => ({
          id: item.id,
          login: item.login,
          displayName: item.displayName,
        })),
    };
  }

  async createPreset(dto: CreateTrainingPresetDto) {
    const name = this.normalizePresetName(dto.name);
    const topics = await this.requireTopicsInOrder(dto.topicIds);

    try {
      return await this.trainingPresetsRepository.create({
        name,
        topicIds: topics.map((topic) => topic.id),
      });
    } catch (error) {
      this.rethrowPresetConflict(error, name);
    }
  }

  async updatePreset(id: string, dto: UpdateTrainingPresetDto) {
    await this.getExistingPresetOrThrow(id);
    const name = this.normalizePresetName(dto.name);
    const topics = await this.requireTopicsInOrder(dto.topicIds);

    try {
      return await this.trainingPresetsRepository.update(id, {
        name,
        topicIds: topics.map((topic) => topic.id),
      });
    } catch (error) {
      this.rethrowPresetConflict(error, name);
    }
  }

  async removePreset(id: string) {
    await this.getExistingPresetOrThrow(id);
    await this.trainingPresetsRepository.remove(id);
  }

  async prepareTraining(dto: PrepareTrainingDto) {
    const startedAt = Date.now();
    const topics = await this.requireTopicsInOrder(dto.topicIds);
    const prepared = await this.questionSelectionRepository.prepareQuestions(
      topics.map((topic) => topic.id),
      String(startedAt),
    );

    return {
      items: prepared.items.map((item) => ({
        id: item.id,
        text: item.text,
        textContent: item.textContent,
        answer: item.answer,
        answerContent: item.answerContent,
        difficulty: item.difficulty,
        topics: item.topics,
        assignedTopic: {
          id: item.assignedTopicId,
          name: item.assignedTopicName,
          slug: item.assignedTopicSlug,
        },
      })),
      total: prepared.items.length,
      meta: {
        tookMs: Date.now() - startedAt,
        requestedPerTopic: DEFAULT_SELECTION_QUESTIONS_PER_TOPIC,
        topicBreakdown: prepared.breakdown,
      },
    };
  }

  async listHistory(currentUser: UserContext) {
    return {
      items: await this.trainingRepository.listHistory(currentUser.id),
    };
  }

  async getHistoryDetail(currentUser: UserContext, id: string) {
    const detail = await this.trainingRepository.getHistoryDetail(currentUser.id, id);

    if (!detail) {
      throw new NotFoundException(`Training session with id '${id}' not found`);
    }

    return detail;
  }

  async saveTrainingResults(currentUser: UserContext, dto: SaveTrainingResultsDto) {
    const questionIds = dto.items.map((item) => item.questionId);
    const uniqueQuestionIds = Array.from(new Set(questionIds));

    if (uniqueQuestionIds.length !== questionIds.length) {
      throw new BadRequestException(
        'Training results must not contain duplicate question ids',
      );
    }

    const [questions, topics, trainingTarget] = await Promise.all([
      this.questionsRepository.findByIds(uniqueQuestionIds),
      this.requireTopicsMap(
        Array.from(
          new Set(dto.items.flatMap((item) => normalizeTopicIds(item.topicIds))),
        ),
      ),
      this.resolveTrainingTarget(currentUser, dto),
    ]);

    if (questions.length !== uniqueQuestionIds.length) {
      throw new BadRequestException('Some questions do not exist');
    }

    const questionsById = new Map(questions.map((question) => [question.id, question]));
    const normalizedItems = dto.items.map((item, index) => {
      const question = questionsById.get(item.questionId);

      if (!question) {
        throw new BadRequestException('Some questions do not exist');
      }

      const difficulty = toDifficultyRank(item.difficulty);

      if (difficulty !== question.difficulty) {
        throw new BadRequestException('Some training items have stale difficulty');
      }

      const topicIds = normalizeTopicIds(item.topicIds);
      const topicSnapshots = topicIds.map((topicId) => {
        const topic = topics.get(topicId);

        if (!topic) {
          throw new BadRequestException('Some topics do not exist');
        }

        return topic;
      });

      return {
        questionId: question.id,
        questionText: question.text,
        questionTextContent: question.textContent,
        difficulty: question.difficulty,
        result: item.result,
        position: index,
        topics: topicSnapshots,
      };
    });

    const correctCount = normalizedItems.filter((item) =>
      isCorrectTrainingResult(item.result),
    ).length;
    const incorrectCount = normalizedItems.filter((item) =>
      isIncorrectTrainingResult(item.result),
    ).length;
    const partialCount = normalizedItems.filter((item) =>
      isPartialTrainingResult(item.result),
    ).length;
    const finishedAt = new Date();

    return this.prisma.$transaction((tx) =>
      this.trainingRepository.saveTrainingSession(
        {
          userId: trainingTarget.userId,
          trainerId: trainingTarget.trainerId,
          status: dto.status as TrainingSessionStatus,
          resultsCount: normalizedItems.length,
          correctCount,
          incorrectCount,
          partialCount,
          feedback: trainingTarget.feedback,
          finishedAt,
          items: normalizedItems,
        },
        tx,
      ),
    );
  }

  private async getExistingPresetOrThrow(id: string) {
    const existing = await this.trainingPresetsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Training preset with id '${id}' not found`);
    }

    return existing;
  }

  private normalizePresetName(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('Training preset name cannot be empty');
    }

    return normalized;
  }

  private async requireTopicsInOrder(topicIds: string[]) {
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

  private async requireTopicsMap(topicIds: string[]) {
    if (topicIds.length === 0) {
      return new Map();
    }

    const topics = await this.topicsRepository.findByIds(topicIds);

    if (topics.length !== topicIds.length) {
      throw new BadRequestException('Some topics do not exist');
    }

    return new Map(topics.map((topic) => [topic.id, topic]));
  }

  private rethrowPresetConflict(error: unknown, name: string): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `Training preset with name '${name}' already exists`,
      );
    }

    throw error;
  }

  private async resolveTrainingTarget(
    currentUser: UserContext,
    dto: SaveTrainingResultsDto,
  ) {
    const normalizedTargetUserId =
      typeof dto.targetUserId === 'string' ? dto.targetUserId.trim() : '';
    const targetUserId = normalizedTargetUserId || currentUser.id;
    const feedback = this.normalizeFeedback(dto.feedback);

    if (targetUserId === currentUser.id) {
      if (feedback) {
        throw new BadRequestException(
          'Feedback is only available when saving training for another user',
        );
      }

      return {
        userId: currentUser.id,
        trainerId: null,
        feedback: null,
      };
    }

    const targetUser = await this.usersRepository.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException(`User with id '${targetUserId}' not found`);
    }

    if (targetUser.status !== UserStatus.ACTIVE || targetUser.role !== UserRole.USER) {
      throw new BadRequestException(
        'Training results can only be saved for active user accounts',
      );
    }

    return {
      userId: targetUser.id,
      trainerId: currentUser.id,
      feedback,
    };
  }

  private normalizeFeedback(value: string | undefined) {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}
