import { Injectable } from '@nestjs/common';
import { coerceQuestionStructuredContent } from '../questions/question-structured-content';
import { QuestionDifficulty, fromDifficultyRank } from '../questions/question-difficulty';
import { fromTrainingResultDb, TrainingResult } from '../training/training-result';
import { AnalyticsRepository } from './analytics.repository';

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
    const [summaryRow, feedbackRows, weakTopicsRows, questionRows] = await Promise.all([
      this.analyticsRepository.getGrowthSummary(userId),
      this.analyticsRepository.getGrowthFeedbackEntries(userId),
      this.analyticsRepository.getGrowthTopicStats(userId),
      this.analyticsRepository.getGrowthQuestionStats(userId),
    ]);

    const questionStats = questionRows.map((item) => ({
      questionId: item.questionId,
      text: item.text,
      textContent: coerceQuestionStructuredContent(item.textContent, item.text) ?? {
        text: item.text,
      },
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
      weakTopics: weakTopicsRows
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
        ),
      failedQuestions: questionStats
        .filter((item) => item.lastResult !== TrainingResult.CORRECT)
        .sort(
          (left, right) =>
            right.incorrectCount +
              right.partialCount -
              left.incorrectCount -
              left.partialCount ||
            right.lastAnsweredAt.getTime() - left.lastAnsweredAt.getTime() ||
            right.questionId.localeCompare(left.questionId, 'ru-RU'),
        ),
      answeredQuestions: questionStats
        .filter((item) => item.lastResult === TrainingResult.CORRECT)
        .sort(
          (left, right) =>
            right.correctCount - left.correctCount ||
            right.lastAnsweredAt.getTime() - left.lastAnsweredAt.getTime() ||
            right.questionId.localeCompare(left.questionId, 'ru-RU'),
        )
    };
  }
}
