import { computed, onMounted, ref } from 'vue';
import type {
  GrowthAnalytics,
  GrowthAnalyticsFeedbackEntry,
  GrowthAnalyticsQuestionStat,
  GrowthAnalyticsTopicStat,
} from '../features/analytics/analytics.types';
import { apiService } from '../services/api.service';
import { toUserErrorMessage } from '../features/system/error.utils';

export function useGrowthCard() {
  const analytics = ref<GrowthAnalytics | null>(null);
  const loading = ref(false);
  const errorMessage = ref('');

  const summary = computed(() =>
    analytics.value?.summary ?? {
      totalResults: 0,
      correctCount: 0,
      incorrectCount: 0,
      partialCount: 0,
      accuracy: 0,
    },
  );

  const weakTopics = computed<GrowthAnalyticsTopicStat[]>(() =>
    analytics.value?.weakTopics ?? [],
  );

  const feedbackEntries = computed<GrowthAnalyticsFeedbackEntry[]>(() =>
    analytics.value?.feedbackEntries ?? [],
  );

  const failedQuestions = computed<GrowthAnalyticsQuestionStat[]>(() =>
    analytics.value?.failedQuestions ?? [],
  );

  const answeredQuestions = computed<GrowthAnalyticsQuestionStat[]>(() =>
    analytics.value?.answeredQuestions ?? [],
  );

  const growthAreaProgress = computed(() =>
    analytics.value?.growthAreaProgress ?? [],
  );

  const recommendations = computed(() =>
    analytics.value?.recommendations ?? [],
  );

  const snapshotLabel = computed(() => {
    if (!summary.value.totalResults) {
      return 'нет данных';
    }

    return `по ${summary.value.totalResults} ответам`;
  });

  async function loadGrowthCard() {
    loading.value = true;
    errorMessage.value = '';

    try {
      analytics.value = await apiService.getGrowthAnalytics();
    } catch (error) {
      errorMessage.value = toUserErrorMessage(
        error,
        'Не удалось загрузить точки роста.',
      );
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void loadGrowthCard();
  });

  return {
    answeredQuestions,
    errorMessage,
    feedbackEntries,
    failedQuestions,
    growthAreaProgress,
    loading,
    recommendations,
    snapshotLabel,
    summary,
    weakTopics,
  };
}
