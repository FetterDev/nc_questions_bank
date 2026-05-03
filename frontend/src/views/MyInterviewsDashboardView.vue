<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import UiChartFrame from '../components/charts/UiChartFrame.vue';
import UiBarChart from '../components/charts/UiBarChart.vue';
import UiStackedBarChart from '../components/charts/UiStackedBarChart.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import type { MyInterviewDashboard } from '../features/interviews/interviews.types';
import { formatDateOnly, formatDateTime } from '../features/interviews/interviews.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { formatTrainingResultCounts } from '../features/training/training.utils';
import { apiService } from '../services/api.service';

const dashboard = ref<MyInterviewDashboard | null>(null);
const loading = ref(false);
const errorMessage = ref('');

const summary = computed(() => dashboard.value?.summary ?? {
  totalInterviews: 0,
  draftCount: 0,
  plannedCount: 0,
  scheduledCount: 0,
  completedCount: 0,
  resultsCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  partialCount: 0,
});

const outcomeSeries = computed(() =>
  (dashboard.value?.outcomeSeries ?? []).map((item) => ({
    label: item.bucketStart,
    meta: `${item.correctCount + item.partialCount + item.incorrectCount} оценок`,
    segments: [
      { value: item.correctCount, color: 'var(--color-success)' },
      { value: item.partialCount, color: 'var(--color-brass)' },
      { value: item.incorrectCount, color: 'var(--color-danger)' },
    ],
  })),
);

const weakTopics = computed(() =>
  (dashboard.value?.weakTopics ?? []).map((item) => ({
    label: item.name,
    value: item.incorrectCount + item.partialCount,
    meta: `${item.accuracy}% успешности`,
    color: 'var(--color-danger)',
  })),
);

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = '';

  try {
    dashboard.value = await apiService.getMyInterviewDashboard();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить статистику собеседований.',
    );
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadDashboard();
});
</script>

<template>
  <section class="page-frame">
    <div class="summary-strip metrics-grid metrics-grid--four">
      <article class="surface-card summary-stat">
        <span>Всего</span>
        <strong>{{ summary.totalInterviews }}</strong>
        <small>Мои интервью как кандидат</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Засчитано</span>
        <strong>{{ summary.correctCount }}</strong>
        <small>Полностью засчитанные</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Частично</span>
        <strong>{{ summary.partialCount }}</strong>
        <small>Частично засчитанные</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Не засчитано</span>
        <strong>{{ summary.incorrectCount }}</strong>
        <small>Не засчитанные</small>
      </article>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading" class="empty-state empty-state-panel" variant="empty">
      <p>Загрузка</p>
    </UiPanel>

    <template v-else>
      <div class="metrics-grid">
        <UiPanel class="detail-panel" variant="detail">
          <UiChartFrame title="Результаты по неделям">
            <UiStackedBarChart :items="outcomeSeries" />
          </UiChartFrame>
        </UiPanel>

        <UiPanel class="detail-panel" variant="detail">
          <UiChartFrame title="Слабые темы">
            <UiBarChart :items="weakTopics" />
          </UiChartFrame>
        </UiPanel>
      </div>

      <div class="split-workspace interviews-dashboard-layout">
        <UiPanel class="detail-panel" variant="detail">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>Комментарии интервьюеров</h2>
            </div>
          </div>

          <div v-if="dashboard?.feedbackEntries.length" class="interview-feedback-list">
            <article
              v-for="entry in dashboard?.feedbackEntries"
              :key="entry.interviewId"
              class="interview-feedback-card"
            >
              <strong>{{ entry.interviewer?.displayName ?? 'Интервьюер' }}</strong>
              <small>{{ formatDateTime(entry.completedAt) }}</small>
              <p>{{ entry.feedback }}</p>
              <small v-if="entry.growthAreas">Зоны роста: {{ entry.growthAreas }}</small>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пока нет обратной связи</p>
          </div>
        </UiPanel>

        <UiPanel class="detail-panel" variant="detail">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>Последние интервью</h2>
            </div>
          </div>

          <div v-if="dashboard?.recentInterviews.length" class="interview-row-list">
            <article
              v-for="item in dashboard?.recentInterviews"
              :key="item.id"
              class="interview-row-card"
            >
              <div class="interview-row-card__copy">
                <strong>{{ item.interviewer.displayName }} - {{ item.interviewee.displayName }}</strong>
                <small>{{ formatDateOnly(item.plannedDate) }}</small>
              </div>
              <small>{{ formatTrainingResultCounts(item) }}</small>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пусто</p>
          </div>
        </UiPanel>
      </div>
    </template>
  </section>
</template>
