<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import UiChartFrame from '../components/charts/UiChartFrame.vue';
import UiBarChart from '../components/charts/UiBarChart.vue';
import UiDonutChart from '../components/charts/UiDonutChart.vue';
import UiStackedBarChart from '../components/charts/UiStackedBarChart.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import type { AdminInterviewDashboard } from '../features/interviews/interviews.types';
import {
  adminDashboardOutcomeTotal,
  formatDateOnly,
  formatInterviewStatus,
} from '../features/interviews/interviews.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { formatTrainingResultCounts } from '../features/training/training.utils';
import { apiService } from '../services/api.service';

const dashboard = ref<AdminInterviewDashboard | null>(null);
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

const scheduleSeries = computed(() =>
  (dashboard.value?.scheduleSeries ?? []).map((item) => ({
    label: item.bucketStart,
    meta: `${item.completedCount} завершено`,
    segments: [
      { value: item.draftCount, color: 'var(--color-ink-muted)' },
      { value: item.plannedCount, color: 'var(--color-brass)' },
      { value: item.scheduledCount, color: 'var(--color-cyan)' },
      { value: item.completedCount, color: 'var(--color-success)' },
      { value: item.overdueCount, color: 'var(--color-danger)' },
    ],
  })),
);

const interviewerLoad = computed(() =>
  (dashboard.value?.interviewerLoad ?? []).map((item) => ({
    label: item.interviewer.displayName,
    value: item.assignedCount,
    meta: `${item.completedCount} завершено`,
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

const donutSegments = computed(() => [
  { label: 'Засчитано', value: dashboard.value?.outcomeMix.correctCount ?? 0, color: 'var(--color-success)' },
  { label: 'Частично', value: dashboard.value?.outcomeMix.partialCount ?? 0, color: 'var(--color-brass)' },
  { label: 'Не засчитано', value: dashboard.value?.outcomeMix.incorrectCount ?? 0, color: 'var(--color-danger)' },
]);

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = '';

  try {
    dashboard.value = await apiService.getAdminInterviewDashboard();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить дашборд собеседований.',
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
        <small>Интервью в диапазоне</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Назначено</span>
        <strong>{{ summary.scheduledCount }}</strong>
        <small>Готовы к запуску</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Завершено</span>
        <strong>{{ summary.completedCount }}</strong>
        <small>Закрытые интервью</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Оценки</span>
        <strong>{{ summary.resultsCount }}</strong>
        <small>Всего зафиксированных оценок</small>
      </article>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading" class="empty-state empty-state-panel" variant="empty">
      <p>Загрузка</p>
    </UiPanel>

    <template v-else>
      <div class="metrics-grid metrics-grid--four">
        <UiPanel class="detail-panel" variant="detail">
          <UiChartFrame title="План/факт по неделям">
            <UiStackedBarChart :items="scheduleSeries" />
          </UiChartFrame>
        </UiPanel>

        <UiPanel class="detail-panel" variant="detail">
          <UiChartFrame title="Итоги завершённых">
            <UiDonutChart :segments="donutSegments" :total-label="'оценок'" />
          </UiChartFrame>
        </UiPanel>

        <UiPanel class="detail-panel" variant="detail">
          <UiChartFrame title="Загрузка интервьюеров">
            <UiBarChart :items="interviewerLoad" />
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
              <h2>Ближайшие интервью</h2>
            </div>
          </div>

          <div v-if="dashboard?.upcoming.length" class="interview-row-list">
            <article v-for="item in dashboard?.upcoming" :key="item.id" class="interview-row-card">
              <div class="interview-row-card__copy">
                <strong>{{ item.interviewer.displayName }} - {{ item.interviewee.displayName }}</strong>
                <small>{{ formatDateOnly(item.plannedDate) }}</small>
              </div>
              <v-chip size="small" variant="tonal">
                {{ formatInterviewStatus(item.status) }}
              </v-chip>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пусто</p>
          </div>
        </UiPanel>

        <UiPanel class="detail-panel" variant="detail">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>Последние завершённые</h2>
            </div>
          </div>

          <div v-if="dashboard?.recentCompleted.length" class="interview-row-list">
            <article v-for="item in dashboard?.recentCompleted" :key="item.id" class="interview-row-card">
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
