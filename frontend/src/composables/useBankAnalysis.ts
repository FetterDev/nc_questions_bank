import { computed, onMounted, ref } from 'vue';
import { formatDifficulty } from '../features/questions/questions.utils';
import { apiService } from '../services/api.service';
import type { BankAnalytics } from '../features/analytics/analytics.types';
import { toUserErrorMessage } from '../features/system/error.utils';

type GrowthFocus = {
  color: 'primary' | 'secondary' | 'accent';
  actionLabel: string;
  description: string;
  routeName: 'question-bank' | 'question-editor-create';
  source: string;
  title: string;
};

export function useBankAnalysis() {
  const analytics = ref<BankAnalytics | null>(null);
  const loading = ref(false);
  const errorMessage = ref('');

  const totalQuestions = computed(() => analytics.value?.totalQuestions ?? 0);

  const difficultyMix = computed(() =>
    (analytics.value?.difficultyMix ?? []).map((item) => ({
      ...item,
      label: formatDifficulty(item.difficulty),
    })),
  );

  const topTopics = computed(() => analytics.value?.topTopics ?? []);
  const sparseTopics = computed(() => analytics.value?.sparseTopics ?? []);

  const dominantDifficulty = computed(() => {
    if (!analytics.value?.dominantDifficulty) {
      return 'нет данных';
    }

    return formatDifficulty(analytics.value.dominantDifficulty);
  });

  const seniorShare = computed(
    () => difficultyMix.value.find((item) => item.difficulty === 'senior')?.share ?? 0,
  );

  const topTopicShare = computed(() => {
    if (!totalQuestions.value || !topTopics.value[0]) {
      return 0;
    }

    return Math.round((topTopics.value[0].count / totalQuestions.value) * 100);
  });

  const focusItems = computed<GrowthFocus[]>(() => {
    if (!totalQuestions.value) {
      return [];
    }

    const items: GrowthFocus[] = [];

    const seniorCount =
      difficultyMix.value.find((item) => item.difficulty === 'senior')?.count ?? 0;

    if (seniorShare.value < 22) {
      items.push({
        color: 'accent',
        actionLabel: 'Добавить вопрос уровня «сеньор»',
        title: 'Усилить слой «сеньор»',
        description: 'Доля вопросов уровня «сеньор» в текущем банке слишком низкая.',
        routeName: 'question-editor-create',
        source: `Сеньор: ${seniorCount} из ${totalQuestions.value} вопросов.`,
      });
    }

    if (sparseTopics.value.length) {
      items.push({
        color: 'secondary',
        actionLabel: 'Проверить редкие темы',
        title: 'Дорастить редкие темы',
        description: 'Есть темы с очень слабым покрытием в опубликованном банке.',
        routeName: 'question-bank',
        source: `Редкие темы: ${sparseTopics.value.slice(0, 3).map((topic) => topic.name).join(', ')}.`,
      });
    }

    if (topTopicShare.value > 30 && topTopics.value[0]) {
      items.push({
        color: 'primary',
        actionLabel: 'Сравнить в банке',
        title: 'Снизить перекос по ведущей теме',
        description: 'Одна тема заняла слишком большую долю опубликованного банка.',
        routeName: 'question-bank',
        source: `Ведущая тема: ${topTopics.value[0].name} · ${topTopics.value[0].count} вопросов.`,
      });
    }

    if (!items.length) {
      items.push({
        color: 'primary',
        actionLabel: 'Открыть редактор',
        title: 'Банк выглядит сбалансированно',
        description: 'Критичных перекосов по текущему опубликованному банку не видно.',
        routeName: 'question-editor-create',
        source: `Баланс сложности: ${difficultyMix.value.map((item) => `${item.label} ${item.share}%`).join(' · ')}.`,
      });
    }

    return items.slice(0, 3);
  });

  const snapshotLabel = computed(() => {
    if (!totalQuestions.value) {
      return 'нет данных';
    }

    return `снимок по ${totalQuestions.value} вопросам`;
  });

  async function loadBankAnalysis() {
    loading.value = true;
    errorMessage.value = '';

    try {
      analytics.value = await apiService.getBankAnalytics();
    } catch (error) {
      errorMessage.value = toUserErrorMessage(
        error,
        'Не удалось загрузить анализ банка вопросов.',
      );
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void loadBankAnalysis();
  });

  return {
    difficultyMix,
    dominantDifficulty,
    errorMessage,
    focusItems,
    loading,
    snapshotLabel,
    sparseTopics,
    topTopics,
    totalQuestions,
  };
}
