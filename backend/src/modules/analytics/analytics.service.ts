import { Injectable } from '@nestjs/common';
import { coerceQuestionStructuredContent } from '../questions/question-structured-content';
import { QuestionDifficulty, fromDifficultyRank } from '../questions/question-difficulty';
import { fromTrainingResultDb, TrainingResult } from '../training/training-result';
import {
  buildGrowthRecommendations,
  buildManagerReport,
  resolveStackLevel,
  type GrowthAreaProgressItem,
} from './analytics-derived';
import { AnalyticsRepository } from './analytics.repository';
import type {
  GrowthAreaCriterionRow,
  TeamActivitySummaryRow,
  TeamAnswerSummaryRow,
  TeamGrowthTopicRow,
  TeamStackLevelRow,
} from './analytics.repository';

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getBankAnalytics() {
    const [totalQuestions, difficultyCounts, topicCounts] = await Promise.all([
      this.analyticsRepository.getBankQuestionsCount(),
      this.analyticsRepository.getBankDifficultyCounts(),
      this.analyticsRepository.getBankTopicCounts(),
    ]);

    const countsByDifficulty = new Map(
      difficultyCounts.map((item) => [item.difficulty, item.count]),
    );
    const difficultyOrder = [
      QuestionDifficulty.JUNIOR,
      QuestionDifficulty.MIDDLE,
      QuestionDifficulty.SENIOR,
      QuestionDifficulty.LEAD,
    ];
    const difficultyMix = difficultyOrder.map((difficulty) => {
      const rank =
        difficulty === QuestionDifficulty.JUNIOR
          ? 1
          : difficulty === QuestionDifficulty.MIDDLE
            ? 2
            : difficulty === QuestionDifficulty.SENIOR
              ? 3
              : 4;
      const count = countsByDifficulty.get(rank) ?? 0;

      return {
        difficulty,
        count,
        share: toPercent(count, totalQuestions),
      };
    });

    const dominant = [...difficultyMix].sort(
      (left, right) => right.count - left.count || left.share - right.share,
    )[0];

    return {
      totalQuestions,
      dominantDifficulty: totalQuestions > 0 ? dominant?.difficulty ?? null : null,
      difficultyMix,
      topTopics: topicCounts.slice(0, 5).map((topic) => ({
        topicId: topic.id,
        name: topic.name,
        slug: topic.slug,
        count: topic.count,
      })),
      sparseTopics: topicCounts
        .filter((topic) => topic.count <= 2)
        .slice(0, 5)
        .map((topic) => ({
          topicId: topic.id,
          name: topic.name,
          slug: topic.slug,
          count: topic.count,
        })),
    };
  }

  async getGrowthAnalytics(userId: string) {
    const [
      summaryRow,
      feedbackRows,
      weakTopicsRows,
      questionRows,
      growthAreaRows,
    ] = await Promise.all([
      this.analyticsRepository.getGrowthSummary(userId),
      this.analyticsRepository.getGrowthFeedbackEntries(userId),
      this.analyticsRepository.getGrowthTopicStats(userId),
      this.analyticsRepository.getGrowthQuestionStats(userId),
      this.analyticsRepository.listGrowthAreaCriteria(userId),
    ]);

    const questionStats = questionRows.map((item) => ({
      questionId: item.questionId,
      text: item.text,
      textContent:
        coerceQuestionStructuredContent(item.textContent, item.text) ?? [
          { kind: 'text', content: item.text },
        ],
      difficulty: fromDifficultyRank(item.difficulty),
      topics: [...item.topics].sort((left, right) =>
        left.slug.localeCompare(right.slug, 'ru-RU'),
      ),
      correctCount: item.correctCount,
      incorrectCount: item.incorrectCount,
      partialCount: item.partialCount,
      lastAnsweredAt: item.lastAnsweredAt,
      lastResult: fromTrainingResultDb(item.lastResult),
    }));

    const weakTopics = weakTopicsRows
      .map((item) => ({
        topicId: item.topicId,
        name: item.name,
        slug: item.slug,
        correctCount: item.correctCount,
        incorrectCount: item.incorrectCount,
        partialCount: item.partialCount,
        accuracy: toPercent(
          item.correctCount,
          item.correctCount + item.incorrectCount + item.partialCount,
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
      );
    const failedQuestions = questionStats
      .filter((item) => item.lastResult !== TrainingResult.CORRECT)
      .sort(
        (left, right) =>
          right.incorrectCount +
            right.partialCount -
            left.incorrectCount -
            left.partialCount ||
          right.lastAnsweredAt.getTime() - left.lastAnsweredAt.getTime() ||
          right.questionId.localeCompare(left.questionId, 'ru-RU'),
      );
    const answeredQuestions = questionStats
      .filter((item) => item.lastResult === TrainingResult.CORRECT)
      .sort(
        (left, right) =>
          right.correctCount - left.correctCount ||
          right.lastAnsweredAt.getTime() - left.lastAnsweredAt.getTime() ||
          right.questionId.localeCompare(left.questionId, 'ru-RU'),
      );
    const growthAreaProgress = buildGrowthAreaProgress(growthAreaRows);

    return {
      summary: {
        totalResults: summaryRow.totalResults,
        correctCount: summaryRow.correctCount,
        incorrectCount: summaryRow.incorrectCount,
        partialCount: summaryRow.partialCount,
        accuracy: toPercent(summaryRow.correctCount, summaryRow.totalResults),
      },
      feedbackEntries: feedbackRows.map((item) => ({
        sessionId: item.sessionId,
        trainer:
          item.trainerId && item.trainerDisplayName && item.trainerLogin
            ? {
                id: item.trainerId,
                displayName: item.trainerDisplayName,
                login: item.trainerLogin,
              }
            : null,
        feedback: item.feedback,
        finishedAt: item.finishedAt,
      })),
      weakTopics,
      failedQuestions,
      answeredQuestions,
      growthAreaProgress,
      recommendations: buildGrowthRecommendations({
        weakTopics,
        failedQuestions,
        growthAreaProgress,
      }),
    };
  }

  async getTeamAnalytics() {
    const [
      employees,
      answerSummaries,
      activitySummaries,
      growthTopicRows,
      stackLevelRows,
    ] = await Promise.all([
      this.analyticsRepository.listTeamEmployees(),
      this.analyticsRepository.getTeamAnswerSummaries(),
      this.analyticsRepository.getTeamActivitySummaries(),
      this.analyticsRepository.getTeamGrowthTopicStats(),
      this.analyticsRepository.getTeamStackLevelRows(),
    ]);
    const answersByUser = new Map(
      answerSummaries.map((item) => [item.userId, item]),
    );
    const activityByUser = new Map(
      activitySummaries.map((item) => [item.userId, item]),
    );
    const growthTopicsByUser = groupGrowthTopics(growthTopicRows);
    const stackLevelsByUser = groupStackLevels(stackLevelRows);
    const totalAnswers = answerSummaries.reduce(
      (total, item) => total + item.totalAnswers,
      0,
    );
    const totalCorrect = answerSummaries.reduce(
      (total, item) => total + item.correctCount,
      0,
    );

    const summary = {
      employeesCount: employees.length,
      employeesWithAnswersCount: answerSummaries.filter(
        (item) => item.totalAnswers > 0,
      ).length,
      totalAnswers,
      averageAccuracy: toPercent(totalCorrect, totalAnswers),
    };
    const items = employees.map((employee) => {
      const answers = answersByUser.get(employee.id);
      const activity = activityByUser.get(employee.id);
      const lastActivityAt = resolveLastActivityAt(answers, activity);

      return {
        user: {
          id: employee.id,
          login: employee.login,
          displayName: employee.displayName,
          role: employee.role,
        },
        stacks: employee.stacks.map((item) => ({
          id: item.stack.id,
          name: item.stack.name,
          slug: item.stack.slug,
        })),
        stackLevels: stackLevelsByUser.get(employee.id) ?? [],
        summary: {
          totalAnswers: answers?.totalAnswers ?? 0,
          correctCount: answers?.correctCount ?? 0,
          incorrectCount: answers?.incorrectCount ?? 0,
          partialCount: answers?.partialCount ?? 0,
          accuracy: toPercent(
            answers?.correctCount ?? 0,
            answers?.totalAnswers ?? 0,
          ),
          trainingSessionsCount: activity?.trainingSessionsCount ?? 0,
          completedInterviewsCount: activity?.completedInterviewsCount ?? 0,
          feedbackCount: activity?.feedbackCount ?? 0,
          lastActivityAt: lastActivityAt?.toISOString() ?? null,
        },
        growthTopics: growthTopicsByUser.get(employee.id) ?? [],
      };
    });

    return {
      summary,
      items,
      managerReport: buildManagerReport({
        generatedAt: new Date(),
        summary,
        employees: items,
      }),
    };
  }
}

function resolveLastActivityAt(
  answers: TeamAnswerSummaryRow | undefined,
  activity: TeamActivitySummaryRow | undefined,
) {
  const dates = [answers?.lastActivityAt, activity?.lastActivityAt].filter(
    (item): item is Date => item instanceof Date,
  );

  if (!dates.length) {
    return null;
  }

  return dates.sort((left, right) => right.getTime() - left.getTime())[0];
}

function groupStackLevels(rows: TeamStackLevelRow[]) {
  const grouped = new Map<
    string,
    Array<{
      stack: {
        id: string;
        name: string;
        slug: string;
      };
      assessedCount: number;
      accuracy: number;
      level: ReturnType<typeof resolveStackLevel>;
    }>
  >();

  for (const row of rows) {
    const total = row.correctCount + row.partialCount + row.incorrectCount;
    const accuracy = toPercent(row.correctCount, total);
    const items = grouped.get(row.userId) ?? [];

    items.push({
      stack: {
        id: row.stackId,
        name: row.stackName,
        slug: row.stackSlug,
      },
      assessedCount: row.totalCount,
      accuracy,
      level: resolveStackLevel({
        assessedCount: row.totalCount,
        accuracy,
      }),
    });
    grouped.set(row.userId, items);
  }

  return new Map(
    [...grouped.entries()].map(([userId, items]) => [
      userId,
      items.sort(
        (left, right) =>
          left.stack.name.localeCompare(right.stack.name, 'ru-RU') ||
          left.stack.id.localeCompare(right.stack.id, 'ru-RU'),
      ),
    ]),
  );
}

function buildGrowthAreaProgress(
  rows: GrowthAreaCriterionRow[],
): GrowthAreaProgressItem[] {
  const grouped = new Map<string, GrowthAreaCriterionRow[]>();

  for (const row of rows) {
    const items = grouped.get(row.competencyId) ?? [];
    items.push(row);
    grouped.set(row.competencyId, items);
  }

  return [...grouped.entries()]
    .map(([competencyId, items]) => {
      const sorted = [...items].sort(
        (left, right) =>
          right.assessedAt.getTime() - left.assessedAt.getTime() ||
          right.criterionId.localeCompare(left.criterionId, 'ru-RU'),
      );
      const latest = sorted[0];
      const correctCount = items.reduce(
        (total, item) =>
          total + (item.result === 'CORRECT' ? Math.max(1, item.weight) : 0),
        0,
      );
      const totalCount = items.reduce(
        (total, item) => total + Math.max(1, item.weight),
        0,
      );
      const resolvedCount = items.filter((item) => item.result === 'CORRECT').length;

      return {
        competencyId,
        name: latest.competencyName,
        slug: latest.competencySlug,
        latestGrowthArea:
          latest.growthArea ??
          `${latest.title}${latest.comment ? ` - ${latest.comment}` : ''}`,
        firstSeenAt: sorted[sorted.length - 1].assessedAt.toISOString(),
        lastSeenAt: latest.assessedAt.toISOString(),
        totalGrowthPoints: items.length,
        resolvedCount,
        currentStatus:
          latest.result === 'CORRECT'
            ? 'resolved' as const
            : 'in_progress' as const,
        accuracy: toPercent(correctCount, totalCount),
        entries: sorted.slice(0, 5).map((item) => ({
          interviewId: item.interviewId,
          criterionId: item.criterionId,
          result: fromTrainingResultDb(item.result),
          growthArea:
            item.growthArea ??
            `${item.title}${item.comment ? ` - ${item.comment}` : ''}`,
          assessedAt: item.assessedAt.toISOString(),
        })),
      };
    })
    .sort(
      (left, right) =>
        Number(left.currentStatus === 'resolved') -
          Number(right.currentStatus === 'resolved') ||
        right.totalGrowthPoints - left.totalGrowthPoints ||
        left.accuracy - right.accuracy ||
        left.name.localeCompare(right.name, 'ru-RU'),
    );
}

function groupGrowthTopics(rows: TeamGrowthTopicRow[]) {
  const grouped = new Map<
    string,
    Array<TeamGrowthTopicRow & { accuracy: number }>
  >();

  for (const row of rows) {
    const total = row.correctCount + row.incorrectCount + row.partialCount;
    const items = grouped.get(row.userId) ?? [];

    items.push({
      ...row,
      accuracy: toPercent(row.correctCount, total),
    });
    grouped.set(row.userId, items);
  }

  return new Map(
    [...grouped.entries()].map(([userId, items]) => [
      userId,
      items
        .sort(
          (left, right) =>
            right.incorrectCount +
              right.partialCount -
              left.incorrectCount -
              left.partialCount ||
            left.accuracy - right.accuracy ||
            left.name.localeCompare(right.name, 'ru-RU') ||
            left.topicId.localeCompare(right.topicId, 'ru-RU'),
        )
        .slice(0, 3)
        .map((item) => ({
          topicId: item.topicId,
          name: item.name,
          slug: item.slug,
          correctCount: item.correctCount,
          incorrectCount: item.incorrectCount,
          partialCount: item.partialCount,
          accuracy: item.accuracy,
        })),
    ]),
  );
}
