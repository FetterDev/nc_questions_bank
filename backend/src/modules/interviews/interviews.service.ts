import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterviewCycleMode,
  InterviewStatus,
  TrainingSessionResultMark,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UserContext } from '../authz/user-context';
import {
  DEFAULT_SELECTION_QUESTIONS_PER_TOPIC,
  QuestionSelectionRepository,
} from '../questions/question-selection.repository';
import { QuestionsRepository } from '../questions/questions.repository';
import { fromDifficultyRank } from '../questions/question-difficulty';
import { TrainingPresetsRepository } from '../training/training-presets.repository';
import {
  buildInterviewFeedback,
  type InterviewFeedbackCriterionInput,
} from './interview-feedback';
import {
  buildCriterionGrowthArea,
  buildInterviewGrowthAreas,
  shouldMarkCriterionAsGrowthPoint,
} from './interview-growth-areas';
import {
  fromTrainingResultDb,
  isCorrectTrainingResult,
  isIncorrectTrainingResult,
  isPartialTrainingResult,
  toTrainingResultDb,
  TrainingResult,
} from '../training/training-result';
import { InterviewsRepository } from './interviews.repository';
import {
  addWeeks,
  createWeeklyBuckets,
  endOfWeekUtc,
  ensureWeeklyPeriod,
  formatDateOnly,
  formatMonth,
  getMonthDays,
  isDateWithinRange,
  parseDateOnly,
  parseMonth,
  startOfTodayUtc,
  startOfWeekUtc,
} from './interview-date';
import { generateDirectedCyclePairs } from './interview-pairing';
import { CompleteInterviewDto } from './dto/complete-interview.dto';
import { CreateInterviewCycleDto } from './dto/create-interview-cycle.dto';
import { CreateInterviewPairDto } from './dto/create-interview-pair.dto';
import { InterviewCalendarQueryDto } from './dto/interview-calendar.query.dto';
import { InterviewDashboardQueryDto } from './dto/interview-dashboard.query.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interviewsRepository: InterviewsRepository,
    private readonly questionSelectionRepository: QuestionSelectionRepository,
    private readonly questionsRepository: QuestionsRepository,
    private readonly trainingPresetsRepository: TrainingPresetsRepository,
  ) {}

  async createCycle(currentUser: UserContext, dto: CreateInterviewCycleDto) {
    const periodStart = parseDateOnly(dto.periodStart, 'periodStart');
    const periodEnd = parseDateOnly(dto.periodEnd, 'periodEnd');
    ensureWeeklyPeriod(periodStart, periodEnd);

    const participantIds = normalizeIdList(dto.participantIds);
    const participants = await this.requireActiveUsers(participantIds);
    const pairs = generateDirectedCyclePairs(participants.map((item) => item.id));

    const created = await this.prisma.$transaction((tx) =>
      this.interviewsRepository.createCycle(
        {
          periodStart,
          periodEnd,
          mode: InterviewCycleMode.AUTO,
          createdByAdminId: currentUser.id,
          pairs,
        },
        tx,
      ),
    );

    return this.toCycleDetailResponse(created);
  }

  async getCycleDetail(id: string) {
    const cycle = await this.interviewsRepository.findCycleById(id);

    if (!cycle) {
      throw new NotFoundException(`Interview cycle with id '${id}' not found`);
    }

    return this.toCycleDetailResponse(cycle);
  }

  async createPair(cycleId: string, dto: CreateInterviewPairDto) {
    const cycle = await this.requireCycle(cycleId);
    const interviewerId = normalizeRequiredId(dto.interviewerId, 'interviewerId');
    const intervieweeId = normalizeRequiredId(dto.intervieweeId, 'intervieweeId');

    this.ensureNotSelfPair(interviewerId, intervieweeId);
    await this.requireActiveUsers([interviewerId, intervieweeId]);
    await this.ensureNoDuplicatePair(cycle.id, interviewerId, intervieweeId);

    const created = await this.interviewsRepository.createInterview({
      cycleId: cycle.id,
      interviewerId,
      intervieweeId,
    });

    return this.toInterviewItemResponse(created);
  }

  async updateInterview(id: string, dto: UpdateInterviewDto) {
    const existing = await this.requireInterview(id);

    if (existing.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('Completed interview cannot be edited');
    }

    const nextInterviewerId =
      dto.interviewerId === undefined
        ? existing.interviewer.id
        : normalizeRequiredId(dto.interviewerId, 'interviewerId');
    const nextIntervieweeId =
      dto.intervieweeId === undefined
        ? existing.interviewee.id
        : normalizeRequiredId(dto.intervieweeId, 'intervieweeId');

    this.ensureNotSelfPair(nextInterviewerId, nextIntervieweeId);
    await this.requireActiveUsers([nextInterviewerId, nextIntervieweeId]);
    await this.ensureNoDuplicatePair(
      existing.cycle.id,
      nextInterviewerId,
      nextIntervieweeId,
      existing.id,
    );

    const nextPlannedDate = this.resolveNextPlannedDate(existing.plannedDate, dto.plannedDate);
    const nextPresetId = await this.resolveNextPresetId(
      existing.preset?.id ?? null,
      dto.presetId,
      nextPlannedDate,
    );

    if (nextPlannedDate && !isDateWithinRange(nextPlannedDate, existing.cycle.periodStart, existing.cycle.periodEnd)) {
      throw new BadRequestException('plannedDate must belong to the interview cycle');
    }

    const participantsChanged =
      nextInterviewerId !== existing.interviewer.id ||
      nextIntervieweeId !== existing.interviewee.id;
    const presetChanged = nextPresetId !== (existing.preset?.id ?? null);
    const nextStatus = resolveInterviewStatus(nextPlannedDate, nextPresetId);
    const shouldRegenerateSnapshot =
      nextStatus === InterviewStatus.SCHEDULED &&
      (participantsChanged || presetChanged || existing.questions.length === 0);
    const shouldClearSnapshot =
      nextStatus !== InterviewStatus.SCHEDULED && existing.questions.length > 0;

    const updated = await this.prisma.$transaction(async (tx) => {
      const interview = await this.interviewsRepository.updateInterview(
        existing.id,
        {
          interviewerId: nextInterviewerId,
          intervieweeId: nextIntervieweeId,
          plannedDate: nextPlannedDate,
          presetId: nextPresetId,
          status: nextStatus,
        },
        tx,
      );

      if (shouldClearSnapshot) {
        await this.interviewsRepository.replaceQuestions(interview.id, [], tx);
      }

      if (shouldRegenerateSnapshot && nextPresetId) {
        await this.regenerateSnapshot(interview.id, nextPresetId, tx);
      }

      return this.interviewsRepository.findInterviewById(interview.id, tx);
    });

    if (!updated) {
      throw new NotFoundException(`Interview with id '${id}' not found`);
    }

    return this.toInterviewItemResponse(updated);
  }

  async removeInterview(id: string) {
    const existing = await this.requireInterview(id);

    if (existing.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('Completed interview cannot be deleted');
    }

    await this.interviewsRepository.deleteInterview(existing.id);
  }

  async getAdminCalendar(query: InterviewCalendarQueryDto) {
    const { month, monthStart, nextMonthStart } = query.month
      ? parseMonth(query.month)
      : parseMonth(formatMonth(startOfTodayUtc()));
    const [items, activeCycle] = await Promise.all([
      this.interviewsRepository.listAdminMonthInterviews(monthStart, nextMonthStart),
      this.interviewsRepository.findLatestCycleOverlapping(monthStart, nextMonthStart),
    ]);

    return {
      month,
      days: getMonthDays(monthStart, nextMonthStart).map((date) => ({ date })),
      items: items.map((item) => this.toInterviewItemResponse(item)),
      activeCycle: activeCycle ? this.toCycleDetailBase(activeCycle) : null,
    };
  }

  async getMyCalendar(currentUser: UserContext, query: InterviewCalendarQueryDto) {
    const { month, monthStart, nextMonthStart } = query.month
      ? parseMonth(query.month)
      : parseMonth(formatMonth(startOfTodayUtc()));
    const items = await this.interviewsRepository.listUserMonthInterviews(
      currentUser.id,
      monthStart,
      nextMonthStart,
    );

    return {
      month,
      days: getMonthDays(monthStart, nextMonthStart).map((date) => ({ date })),
      items: items.map((item) => ({
        ...this.toInterviewItemResponse(item),
        myRole: item.interviewer.id === currentUser.id ? 'interviewer' : 'interviewee',
      })),
    };
  }

  async getRuntime(currentUser: UserContext, id: string) {
    const interview = await this.requireInterview(id);

    if (interview.interviewer.id !== currentUser.id) {
      throw new ForbiddenException('Only interviewer can access interview runtime');
    }

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException('Interview must be scheduled before runtime');
    }

    return {
      interview: this.toInterviewItemResponse(interview),
      counterpart: this.toUserResponse(interview.interviewee),
      items: interview.questions.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        questionText: item.questionText,
        questionTextContent: item.questionTextContent,
        answer: item.answer,
        answerContent: item.answerContent,
        difficulty: fromDifficultyRank(item.difficulty),
        position: item.position,
        topics: item.topics,
        criteria: item.criteria.map((criterion) => ({
          id: criterion.id,
          sourceCriterionId: criterion.sourceCriterionId,
          competency: criterion.competencyId
            ? {
                id: criterion.competencyId,
                name: criterion.competencyName ?? '',
                slug: criterion.competencySlug ?? '',
              }
            : null,
          title: criterion.title,
          description: criterion.description,
          weight: criterion.weight,
          position: criterion.position,
        })),
      })),
    };
  }

  async completeInterview(
    currentUser: UserContext,
    id: string,
    dto: CompleteInterviewDto,
  ) {
    const interview = await this.requireInterview(id);

    if (interview.interviewer.id !== currentUser.id) {
      throw new ForbiddenException('Only interviewer can complete interview');
    }

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled interview can be completed');
    }

    const payloadItems = dto.items.map((item) => ({
      interviewQuestionId: normalizeRequiredId(item.interviewQuestionId, 'interviewQuestionId'),
      result: item.result,
      criteriaResults: (item.criteriaResults ?? []).map((criterion) => ({
        criterionId: normalizeRequiredId(criterion.criterionId, 'criterionId'),
        result: criterion.result,
        comment: normalizeNullableText(criterion.comment),
        isGrowthPoint: Boolean(criterion.isGrowthPoint),
        growthArea: normalizeNullableText(criterion.growthArea),
      })),
    }));
    const uniqueIds = new Set(payloadItems.map((item) => item.interviewQuestionId));

    if (uniqueIds.size !== payloadItems.length) {
      throw new BadRequestException('Interview completion must not contain duplicate questions');
    }

    if (payloadItems.length !== interview.questions.length) {
      throw new BadRequestException('Interview completion must include all interview questions');
    }

    const questionsById = new Set(interview.questions.map((item) => item.id));

    for (const item of payloadItems) {
      const question = interview.questions.find(
        (questionItem) => questionItem.id === item.interviewQuestionId,
      );

      if (!question || !questionsById.has(item.interviewQuestionId)) {
        throw new BadRequestException('Interview completion contains foreign question ids');
      }

      this.ensureCriteriaCompletion(question, item.criteriaResults);
    }

    const normalizedItems = payloadItems.map((item) => {
      const question = interview.questions.find(
        (questionItem) => questionItem.id === item.interviewQuestionId,
      );

      if (!question) {
        throw new BadRequestException('Interview completion contains foreign question ids');
      }

      const result = question.criteria.length > 0
        ? deriveQuestionResultFromCriteria(item.criteriaResults)
        : item.result;

      return {
        ...item,
        result,
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
    const completedAt = new Date();
    const feedbackCriteria = buildFeedbackCriteria(interview, normalizedItems);
    const growthCriteria = buildGrowthCriteria(interview, normalizedItems);
    const growthByCriterionId = new Map(
      growthCriteria.map((criterion) => [criterion.criterionId, criterion]),
    );
    const growthAreas = buildInterviewGrowthAreas({
      manualGrowthAreas: dto.growthAreas,
      criteria: growthCriteria,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.interviewsRepository.updateQuestionResults(
        interview.id,
        normalizedItems.map((item) => ({
          interviewQuestionId: item.interviewQuestionId,
          result: toTrainingResultDb(item.result),
          criteriaResults: item.criteriaResults.map((criterion) => ({
            criterionId: criterion.criterionId,
            result: toTrainingResultDb(criterion.result),
            comment: criterion.comment,
            isGrowthPoint:
              growthByCriterionId.get(criterion.criterionId)?.isGrowthPoint ?? false,
            growthArea:
              growthByCriterionId.get(criterion.criterionId)?.growthArea ?? null,
          })),
        })),
        tx,
      );

      const feedback = normalizeNullableText(dto.feedback) ??
        buildInterviewFeedback({
          resultsCount: payloadItems.length,
          correctCount,
          partialCount,
          incorrectCount,
          criteria: feedbackCriteria,
        });

      await this.interviewsRepository.updateInterview(
        interview.id,
        {
          status: InterviewStatus.COMPLETED,
          completedAt,
          feedback,
          growthAreas,
          resultsCount: payloadItems.length,
          correctCount,
          incorrectCount,
          partialCount,
        },
        tx,
      );

      return this.interviewsRepository.findInterviewById(interview.id, tx);
    });

    if (!updated) {
      throw new NotFoundException(`Interview with id '${id}' not found`);
    }

    return this.toInterviewItemResponse(updated);
  }

  async getAdminDashboard(query: InterviewDashboardQueryDto) {
    const range = this.resolveAdminDashboardRange(query);
    const [interviews, upcoming, recentCompleted] = await Promise.all([
      this.interviewsRepository.listInterviewsOverlappingRange(range.from, range.to),
      this.interviewsRepository.listUpcoming(startOfTodayUtc(), range.to, 5),
      this.interviewsRepository.listRecentCompleted(range.from, range.to, 5),
    ]);

    const completed = interviews.filter((item) => item.status === InterviewStatus.COMPLETED);
    const buckets = createWeeklyBuckets(range.from, range.to);
    const today = startOfTodayUtc();

    return {
      summary: {
        totalInterviews: interviews.length,
        draftCount: interviews.filter((item) => item.status === InterviewStatus.DRAFT).length,
        plannedCount: interviews.filter((item) => item.status === InterviewStatus.PLANNED).length,
        scheduledCount: interviews.filter((item) => item.status === InterviewStatus.SCHEDULED).length,
        completedCount: completed.length,
        resultsCount: completed.reduce((total, item) => total + item.resultsCount, 0),
        correctCount: completed.reduce((total, item) => total + item.correctCount, 0),
        incorrectCount: completed.reduce((total, item) => total + item.incorrectCount, 0),
        partialCount: completed.reduce((total, item) => total + item.partialCount, 0),
      },
      scheduleSeries: buckets.map((bucket) => ({
        bucketStart: bucket.label,
        draftCount: interviews.filter(
          (item) =>
            item.status === InterviewStatus.DRAFT &&
            item.cycle.periodStart.getTime() >= bucket.start.getTime() &&
            item.cycle.periodStart.getTime() <= bucket.end.getTime(),
        ).length,
        plannedCount: interviews.filter(
          (item) =>
            item.status === InterviewStatus.PLANNED &&
            isPlannedDateInsideBucket(item.plannedDate, bucket.start, bucket.end),
        ).length,
        scheduledCount: interviews.filter(
          (item) =>
            item.status === InterviewStatus.SCHEDULED &&
            isPlannedDateInsideBucket(item.plannedDate, bucket.start, bucket.end),
        ).length,
        completedCount: interviews.filter(
          (item) =>
            item.status === InterviewStatus.COMPLETED &&
            isPlannedDateInsideBucket(item.plannedDate, bucket.start, bucket.end),
        ).length,
        overdueCount: interviews.filter(
          (item) =>
            item.status !== InterviewStatus.COMPLETED &&
            item.plannedDate !== null &&
            item.plannedDate.getTime() < today.getTime() &&
            isPlannedDateInsideBucket(item.plannedDate, bucket.start, bucket.end),
        ).length,
      })),
      outcomeMix: {
        correctCount: completed.reduce((total, item) => total + item.correctCount, 0),
        partialCount: completed.reduce((total, item) => total + item.partialCount, 0),
        incorrectCount: completed.reduce((total, item) => total + item.incorrectCount, 0),
      },
      interviewerLoad: this.aggregateInterviewerLoad(interviews),
      weakTopics: this.aggregateWeakTopics(completed),
      upcoming: upcoming.map((item) => this.toInterviewItemResponse(item)),
      recentCompleted: recentCompleted.map((item) => this.toInterviewItemResponse(item)),
    };
  }

  async getMyDashboard(currentUser: UserContext, query: InterviewDashboardQueryDto) {
    const range = this.resolveUserDashboardRange(query);
    const interviews = await this.interviewsRepository.listIntervieweeInterviewsOverlappingRange(
      currentUser.id,
      range.from,
      range.to,
    );
    const completed = interviews.filter((item) => item.status === InterviewStatus.COMPLETED);
    const buckets = createWeeklyBuckets(range.from, range.to);

    return {
      summary: {
        totalInterviews: interviews.length,
        draftCount: interviews.filter((item) => item.status === InterviewStatus.DRAFT).length,
        plannedCount: interviews.filter((item) => item.status === InterviewStatus.PLANNED).length,
        scheduledCount: interviews.filter((item) => item.status === InterviewStatus.SCHEDULED).length,
        completedCount: completed.length,
        resultsCount: completed.reduce((total, item) => total + item.resultsCount, 0),
        correctCount: completed.reduce((total, item) => total + item.correctCount, 0),
        incorrectCount: completed.reduce((total, item) => total + item.incorrectCount, 0),
        partialCount: completed.reduce((total, item) => total + item.partialCount, 0),
      },
      outcomeSeries: buckets.map((bucket) => ({
        bucketStart: bucket.label,
        correctCount: completed
          .filter((item) => isCompletedInsideBucket(item.completedAt, bucket.start, bucket.end))
          .reduce((total, item) => total + item.correctCount, 0),
        partialCount: completed
          .filter((item) => isCompletedInsideBucket(item.completedAt, bucket.start, bucket.end))
          .reduce((total, item) => total + item.partialCount, 0),
        incorrectCount: completed
          .filter((item) => isCompletedInsideBucket(item.completedAt, bucket.start, bucket.end))
          .reduce((total, item) => total + item.incorrectCount, 0),
      })),
      weakTopics: this.aggregateWeakTopics(completed),
      feedbackEntries: completed
        .filter((item) => Boolean(item.feedback))
        .sort(
          (left, right) =>
            (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0) ||
            right.id.localeCompare(left.id, 'ru-RU'),
        )
        .slice(0, 5)
        .map((item) => ({
          interviewId: item.id,
          interviewer: this.toUserResponse(item.interviewer),
          feedback: item.feedback ?? '',
          growthAreas: item.growthAreas,
          completedAt: item.completedAt?.toISOString() ?? new Date(0).toISOString(),
        })),
      recentInterviews: completed
        .sort(
          (left, right) =>
            (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0) ||
            right.id.localeCompare(left.id, 'ru-RU'),
        )
        .slice(0, 5)
        .map((item) => this.toInterviewItemResponse(item)),
    };
  }

  async getMyHistory(currentUser: UserContext) {
    const interviews = await this.interviewsRepository.listIntervieweeCompletedInterviews(
      currentUser.id,
    );

    return {
      items: interviews.map((item) => this.toInterviewItemResponse(item)),
    };
  }

  async getUserHistory(userId: string) {
    const user = await this.requireActiveInterviewUser(
      normalizeRequiredId(userId, 'userId'),
    );
    const interviews = await this.interviewsRepository.listIntervieweeCompletedInterviews(
      user.id,
    );

    return {
      items: interviews.map((item) => this.toInterviewItemResponse(item)),
    };
  }

  async getInterviewDetail(currentUser: UserContext, id: string) {
    const interview = await this.requireInterview(id);

    if (interview.status !== InterviewStatus.COMPLETED) {
      throw new BadRequestException('Interview must be completed before detail is available');
    }

    if (
      currentUser.role === UserRole.USER &&
      interview.interviewer.id !== currentUser.id &&
      interview.interviewee.id !== currentUser.id
    ) {
      throw new ForbiddenException('Only interview participants can access interview detail');
    }

    return {
      interview: this.toInterviewItemResponse(interview),
      interviewer: this.toUserResponse(interview.interviewer),
      interviewee: this.toUserResponse(interview.interviewee),
      feedback: interview.feedback,
      growthAreas: interview.growthAreas,
      questions: interview.questions.map((question) => ({
        id: question.id,
        questionId: question.questionId,
        questionText: question.questionText,
        questionTextContent: question.questionTextContent,
        answer: question.answer,
        answerContent: question.answerContent,
        difficulty: fromDifficultyRank(question.difficulty),
        result: question.result ? fromTrainingResultDb(question.result) : null,
        position: question.position,
        topics: question.topics,
        criteria: question.criteria.map((criterion) => ({
          id: criterion.id,
          title: criterion.title,
          description: criterion.description,
          weight: criterion.weight,
          position: criterion.position,
          result: criterion.result ? fromTrainingResultDb(criterion.result) : null,
          comment: criterion.comment,
          isGrowthPoint: criterion.isGrowthPoint,
          growthArea: criterion.growthArea,
          competency: criterion.competencyId
            ? {
                id: criterion.competencyId,
                name: criterion.competencyName ?? '',
                slug: criterion.competencySlug ?? '',
              }
            : null,
        })),
      })),
      competencySummary: this.aggregateCompetencyCriteria(interview),
    };
  }

  private async requireCycle(id: string) {
    const cycle = await this.interviewsRepository.findCycleById(id);

    if (!cycle) {
      throw new NotFoundException(`Interview cycle with id '${id}' not found`);
    }

    return cycle;
  }

  private async requireInterview(id: string) {
    const interview = await this.interviewsRepository.findInterviewById(id);

    if (!interview) {
      throw new NotFoundException(`Interview with id '${id}' not found`);
    }

    return interview;
  }

  private async requireActiveUsers(ids: string[]) {
    const normalizedIds = normalizeIdList(ids);
    const users = await this.interviewsRepository.findActiveUsersByIds(normalizedIds);

    if (users.length !== normalizedIds.length) {
      throw new BadRequestException('Interview participants must be active USER accounts');
    }

    return users;
  }

  private async requireActiveInterviewUser(id: string) {
    const users = await this.interviewsRepository.findActiveUsersByIds([id]);

    if (users.length !== 1) {
      throw new NotFoundException(`Active interview user with id '${id}' not found`);
    }

    return users[0];
  }

  private ensureNotSelfPair(interviewerId: string, intervieweeId: string) {
    if (interviewerId === intervieweeId) {
      throw new BadRequestException('interviewerId and intervieweeId must differ');
    }
  }

  private async ensureNoDuplicatePair(
    cycleId: string,
    interviewerId: string,
    intervieweeId: string,
    excludeId?: string,
  ) {
    const duplicate = await this.interviewsRepository.findInterviewDuplicate(
      cycleId,
      interviewerId,
      intervieweeId,
      excludeId,
    );

    if (duplicate) {
      throw new BadRequestException('Duplicate directed pair in interview cycle');
    }
  }

  private resolveNextPlannedDate(
    currentValue: Date | null,
    nextValue: string | null | undefined,
  ) {
    if (nextValue === undefined) {
      return currentValue;
    }

    const normalized = typeof nextValue === 'string' ? nextValue.trim() : '';

    if (!normalized) {
      return null;
    }

    return parseDateOnly(normalized, 'plannedDate');
  }

  private async resolveNextPresetId(
    currentValue: string | null,
    nextValue: string | null | undefined,
    plannedDate: Date | null,
  ) {
    if (nextValue === undefined) {
      return currentValue;
    }

    const normalized = typeof nextValue === 'string' ? nextValue.trim() : '';

    if (!normalized) {
      return null;
    }

    if (!plannedDate) {
      throw new BadRequestException('presetId requires plannedDate');
    }

    const preset = await this.trainingPresetsRepository.findById(normalized);

    if (!preset) {
      throw new NotFoundException(`Training preset with id '${normalized}' not found`);
    }

    return preset.id;
  }

  private async regenerateSnapshot(interviewId: string, presetId: string, tx: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0]) {
    const preset = await this.trainingPresetsRepository.findById(presetId, tx as never);

    if (!preset) {
      throw new NotFoundException(`Training preset with id '${presetId}' not found`);
    }

    const selected = await this.questionSelectionRepository.prepareQuestions(
      preset.topics.map((topic) => topic.id),
      interviewId,
      DEFAULT_SELECTION_QUESTIONS_PER_TOPIC,
    );

    if (selected.items.length === 0) {
      throw new BadRequestException('Selected preset does not produce any interview questions');
    }

    const liveQuestions = await this.questionsRepository.findByIds(
      selected.items.map((item) => item.id),
      tx as never,
    );
    const liveQuestionsById = new Map(liveQuestions.map((item) => [item.id, item]));

    await this.interviewsRepository.replaceQuestions(
      interviewId,
      selected.items.map((item, index) => {
        const liveQuestion = liveQuestionsById.get(item.id);

        return {
          questionId: item.id,
          questionText: item.text,
          questionTextContent: item.textContent,
          answer: item.answer,
          answerContent: item.answerContent,
          difficulty: item.difficulty === 'junior'
            ? 1
            : item.difficulty === 'middle'
              ? 2
              : item.difficulty === 'senior'
                ? 3
                : 4,
          position: index,
          topics: item.topics,
          criteria: liveQuestion?.evaluationCriteria.map((criterion) => ({
            sourceCriterionId: criterion.id,
            competencyId: criterion.competency?.id ?? null,
            competencyName: criterion.competency?.name ?? null,
            competencySlug: criterion.competency?.slug ?? null,
            title: criterion.title,
            description: criterion.description,
            weight: criterion.weight,
            position: criterion.position,
          })) ?? [],
        };
      }),
      tx as never,
    );
  }

  private ensureCriteriaCompletion(
    question: Awaited<ReturnType<InterviewsService['requireInterview']>>['questions'][number],
    criteriaResults: Array<{
      criterionId: string;
      result: TrainingResult;
      comment: string | null;
    }>,
  ) {
    if (criteriaResults.length === 0 && question.criteria.length === 0) {
      return;
    }

    const uniqueIds = new Set(criteriaResults.map((item) => item.criterionId));

    if (uniqueIds.size !== criteriaResults.length) {
      throw new BadRequestException('Interview completion must not contain duplicate criteria');
    }

    const criteriaById = new Set(question.criteria.map((criterion) => criterion.id));

    if (criteriaResults.length !== question.criteria.length) {
      throw new BadRequestException('Interview completion must include all question criteria');
    }

    for (const criterion of criteriaResults) {
      if (!criteriaById.has(criterion.criterionId)) {
        throw new BadRequestException('Interview completion contains foreign criterion ids');
      }
    }
  }

  private resolveAdminDashboardRange(query: InterviewDashboardQueryDto) {
    const today = startOfTodayUtc();
    const defaultFrom = startOfWeekUtc(addWeeks(today, -3));
    const defaultTo = endOfWeekUtc(addWeeks(today, 4));

    return {
      from: query.from ? parseDateOnly(query.from, 'from') : defaultFrom,
      to: query.to ? parseDateOnly(query.to, 'to') : defaultTo,
    };
  }

  private resolveUserDashboardRange(query: InterviewDashboardQueryDto) {
    const today = startOfTodayUtc();
    const defaultTo = endOfWeekUtc(today);
    const defaultFrom = startOfWeekUtc(addWeeks(today, -7));

    return {
      from: query.from ? parseDateOnly(query.from, 'from') : defaultFrom,
      to: query.to ? parseDateOnly(query.to, 'to') : defaultTo,
    };
  }

  private aggregateInterviewerLoad(interviews: Awaited<ReturnType<InterviewsService['requireInterview']>>[]) {
    const grouped = new Map<
      string,
      {
        interviewer: ReturnType<InterviewsService['toUserResponse']>;
        assignedCount: number;
        completedCount: number;
      }
    >();

    for (const interview of interviews) {
      const existing = grouped.get(interview.interviewer.id) ?? {
        interviewer: this.toUserResponse(interview.interviewer),
        assignedCount: 0,
        completedCount: 0,
      };

      existing.assignedCount += 1;

      if (interview.status === InterviewStatus.COMPLETED) {
        existing.completedCount += 1;
      }

      grouped.set(interview.interviewer.id, existing);
    }

    return [...grouped.values()].sort(
      (left, right) =>
        right.assignedCount - left.assignedCount ||
        right.completedCount - left.completedCount ||
        left.interviewer.displayName.localeCompare(right.interviewer.displayName, 'ru-RU') ||
        left.interviewer.id.localeCompare(right.interviewer.id, 'ru-RU'),
    );
  }

  private aggregateWeakTopics(interviews: Awaited<ReturnType<InterviewsService['requireInterview']>>[]) {
    const grouped = new Map<
      string,
      {
        topicId: string;
        name: string;
        correctCount: number;
        partialCount: number;
        incorrectCount: number;
      }
    >();

    for (const interview of interviews) {
      for (const question of interview.questions) {
        if (!question.result) {
          continue;
        }

        for (const topic of question.topics) {
          const existing = grouped.get(topic.id) ?? {
            topicId: topic.id,
            name: topic.name,
            correctCount: 0,
            partialCount: 0,
            incorrectCount: 0,
          };

          const result = fromTrainingResultDb(question.result);

          if (isCorrectTrainingResult(result)) {
            existing.correctCount += 1;
          } else if (isPartialTrainingResult(result)) {
            existing.partialCount += 1;
          } else {
            existing.incorrectCount += 1;
          }

          grouped.set(topic.id, existing);
        }
      }
    }

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        accuracy: toPercent(
          item.correctCount,
          item.correctCount + item.partialCount + item.incorrectCount,
        ),
      }))
      .sort(
        (left, right) =>
          right.incorrectCount +
            right.partialCount -
            left.incorrectCount -
            left.partialCount ||
          left.accuracy - right.accuracy ||
          right.topicId.localeCompare(left.topicId, 'ru-RU'),
      )
      .slice(0, 8);
  }

  private aggregateCompetencyCriteria(interview: Awaited<ReturnType<InterviewsService['requireInterview']>>) {
    const grouped = new Map<
      string,
      {
        competencyId: string;
        name: string;
        slug: string;
        correctCount: number;
        partialCount: number;
        incorrectCount: number;
      }
    >();

    for (const question of interview.questions) {
      for (const criterion of question.criteria) {
        if (!criterion.competencyId || !criterion.result) {
          continue;
        }

        const existing = grouped.get(criterion.competencyId) ?? {
          competencyId: criterion.competencyId,
          name: criterion.competencyName ?? '',
          slug: criterion.competencySlug ?? '',
          correctCount: 0,
          partialCount: 0,
          incorrectCount: 0,
        };
        const result = fromTrainingResultDb(criterion.result);
        const weight = Math.max(1, criterion.weight);

        if (isCorrectTrainingResult(result)) {
          existing.correctCount += weight;
        } else if (isPartialTrainingResult(result)) {
          existing.partialCount += weight;
        } else {
          existing.incorrectCount += weight;
        }

        grouped.set(criterion.competencyId, existing);
      }
    }

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        accuracy: toPercent(
          item.correctCount,
          item.correctCount + item.partialCount + item.incorrectCount,
        ),
      }))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name, 'ru-RU') ||
          left.competencyId.localeCompare(right.competencyId, 'ru-RU'),
      );
  }

  private toCycleDetailResponse(cycle: Awaited<ReturnType<InterviewsRepository['findCycleById']>> extends infer T ? NonNullable<T> : never) {
    return {
      ...this.toCycleDetailBase(cycle),
      draftCount: cycle.interviews.filter((item) => item.status === InterviewStatus.DRAFT).length,
      plannedCount: cycle.interviews.filter((item) => item.status === InterviewStatus.PLANNED).length,
      scheduledCount: cycle.interviews.filter((item) => item.status === InterviewStatus.SCHEDULED).length,
      completedCount: cycle.interviews.filter((item) => item.status === InterviewStatus.COMPLETED).length,
    };
  }

  private toCycleDetailBase(cycle: Awaited<ReturnType<InterviewsRepository['findCycleById']>> extends infer T ? NonNullable<T> : never) {
    return {
      id: cycle.id,
      mode: cycle.mode,
      periodStart: formatDateOnly(cycle.periodStart),
      periodEnd: formatDateOnly(cycle.periodEnd),
      createdByAdmin: this.toUserResponse(cycle.createdByAdmin),
      interviews: cycle.interviews.map((item) => this.toInterviewItemResponse(item)),
    };
  }

  private toInterviewItemResponse(interview: Awaited<ReturnType<InterviewsService['requireInterview']>>) {
    return {
      id: interview.id,
      status: interview.status,
      plannedDate: interview.plannedDate ? formatDateOnly(interview.plannedDate) : null,
      preset: interview.preset ? { ...interview.preset } : null,
      interviewer: this.toUserResponse(interview.interviewer),
      interviewee: this.toUserResponse(interview.interviewee),
      resultsCount: interview.resultsCount,
      correctCount: interview.correctCount,
      incorrectCount: interview.incorrectCount,
      partialCount: interview.partialCount,
      completedAt: interview.completedAt?.toISOString() ?? null,
    };
  }

  private toUserResponse(user: {
    id: string;
    login: string;
    displayName: string;
  }) {
    return {
      id: user.id,
      login: user.login,
      displayName: user.displayName,
    };
  }
}

function normalizeRequiredId(value: string | null | undefined, fieldLabel: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} must not be empty`);
  }

  return normalized;
}

function normalizeIdList(values: string[]) {
  const normalized = values
    .map((value) => normalizeRequiredId(value, 'participantIds'))
    .filter((value, index, list) => list.indexOf(value) === index);

  if (normalized.length < 2) {
    throw new BadRequestException('Interview cycle requires at least two distinct participants');
  }

  return normalized;
}

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function resolveInterviewStatus(plannedDate: Date | null, presetId: string | null) {
  if (!plannedDate) {
    return InterviewStatus.DRAFT;
  }

  if (!presetId) {
    return InterviewStatus.PLANNED;
  }

  return InterviewStatus.SCHEDULED;
}

function deriveQuestionResultFromCriteria(
  criteriaResults: Array<{
    result: TrainingResult;
  }>,
) {
  if (criteriaResults.some((item) => isIncorrectTrainingResult(item.result))) {
    return TrainingResult.INCORRECT;
  }

  if (criteriaResults.every((item) => isCorrectTrainingResult(item.result))) {
    return TrainingResult.CORRECT;
  }

  return TrainingResult.PARTIAL;
}

function buildFeedbackCriteria(
  interview: {
    questions: Array<{
      criteria: Array<{
        id: string;
        title: string;
        competencyName: string | null;
      }>;
    }>;
  },
  items: Array<{
    interviewQuestionId: string;
    criteriaResults: Array<{
      criterionId: string;
      result: TrainingResult;
      comment: string | null;
    }>;
  }>,
): InterviewFeedbackCriterionInput[] {
  const resultsByCriterionId = new Map(
    items.flatMap((item) =>
      item.criteriaResults.map((criterion) => [
        criterion.criterionId,
        criterion,
      ] as const),
    ),
  );

  return interview.questions.flatMap((question) =>
    question.criteria.flatMap((criterion) => {
      const result = resultsByCriterionId.get(criterion.id);

      if (!result) {
        return [];
      }

      return [{
        title: criterion.title,
        competencyName: criterion.competencyName,
        result: result.result as InterviewFeedbackCriterionInput['result'],
        comment: result.comment,
      }];
    }),
  );
}

function buildGrowthCriteria(
  interview: {
    questions: Array<{
      criteria: Array<{
        id: string;
        title: string;
        competencyName: string | null;
      }>;
    }>;
  },
  items: Array<{
    criteriaResults: Array<{
      criterionId: string;
      result: TrainingResult;
      comment: string | null;
      isGrowthPoint: boolean;
      growthArea: string | null;
    }>;
  }>,
) {
  const resultsByCriterionId = new Map(
    items.flatMap((item) =>
      item.criteriaResults.map((criterion) => [
        criterion.criterionId,
        criterion,
      ] as const),
    ),
  );

  return interview.questions.flatMap((question) =>
    question.criteria.flatMap((criterion) => {
      const result = resultsByCriterionId.get(criterion.id);

      if (!result) {
        return [];
      }

      const input = {
        criterionId: criterion.id,
        title: criterion.title,
        competencyName: criterion.competencyName,
        result: result.result,
        comment: result.comment,
        isGrowthPoint: result.isGrowthPoint,
        growthArea: result.growthArea,
      };
      const growthArea = buildCriterionGrowthArea(input);

      return [{
        ...input,
        isGrowthPoint: shouldMarkCriterionAsGrowthPoint(input),
        growthArea,
      }];
    }),
  );
}

function isPlannedDateInsideBucket(
  plannedDate: Date | null,
  bucketStart: Date,
  bucketEnd: Date,
) {
  if (!plannedDate) {
    return false;
  }

  return plannedDate.getTime() >= bucketStart.getTime() && plannedDate.getTime() <= bucketEnd.getTime();
}

function isCompletedInsideBucket(
  completedAt: Date | null,
  bucketStart: Date,
  bucketEnd: Date,
) {
  if (!completedAt) {
    return false;
  }

  return completedAt.getTime() >= bucketStart.getTime() && completedAt.getTime() <= bucketEnd.getTime();
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
