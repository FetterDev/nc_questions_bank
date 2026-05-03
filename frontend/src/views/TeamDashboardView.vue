<script setup lang="ts">
import { mdiAccountGroupOutline, mdiHistory, mdiRefresh } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import type {
  TeamAnalytics,
  TeamAnalyticsEmployee,
  TeamAnalyticsGrowthTopic,
} from '../features/analytics/analytics.types';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

type SortMode = 'growth' | 'name' | 'activity';

const analytics = ref<TeamAnalytics | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const searchQuery = ref('');
const stackFilter = ref('all');
const sortMode = ref<SortMode>('growth');

const sortOptions: Array<{ title: string; value: SortMode }> = [
  { title: 'Сначала зоны риска', value: 'growth' },
  { title: 'По имени', value: 'name' },
  { title: 'По активности', value: 'activity' },
];

const summary = computed(() =>
  analytics.value?.summary ?? {
    employeesCount: 0,
    employeesWithAnswersCount: 0,
    totalAnswers: 0,
    averageAccuracy: 0,
  },
);

const stackOptions = computed(() => {
  const stacks = new Map<string, { title: string; value: string }>();

  for (const employee of analytics.value?.items ?? []) {
    for (const stack of employee.stacks) {
      stacks.set(stack.id, {
        title: stack.name,
        value: stack.id,
      });
    }
  }

  return [
    { title: 'Все стеки', value: 'all' },
    ...[...stacks.values()].sort((left, right) =>
      left.title.localeCompare(right.title, 'ru-RU'),
    ),
  ];
});

const employees = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('ru-RU');

  return [...(analytics.value?.items ?? [])]
    .filter((employee) => {
      const matchesSearch =
        !query ||
        [
          employee.user.displayName,
          employee.user.login,
          employee.stacks.map((stack) => stack.name).join(' '),
        ]
          .join(' ')
          .toLocaleLowerCase('ru-RU')
          .includes(query);
      const matchesStack =
        stackFilter.value === 'all' ||
        employee.stacks.some((stack) => stack.id === stackFilter.value);

      return matchesSearch && matchesStack;
    })
    .sort(compareEmployees);
});

const visibleEmployeesLabel = computed(() =>
  `${employees.value.length} из ${summary.value.employeesCount}`,
);

async function loadTeamAnalytics() {
  loading.value = true;
  errorMessage.value = '';

  try {
    analytics.value = await apiService.getTeamAnalytics();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить статистику сотрудников.',
    );
  } finally {
    loading.value = false;
  }
}

function compareEmployees(left: TeamAnalyticsEmployee, right: TeamAnalyticsEmployee) {
  if (sortMode.value === 'activity') {
    return (
      dateRank(right.summary.lastActivityAt) -
        dateRank(left.summary.lastActivityAt) ||
      compareEmployeeNames(left, right)
    );
  }

  if (sortMode.value === 'name') {
    return compareEmployeeNames(left, right);
  }

  const leftHasAnswers = left.summary.totalAnswers > 0;
  const rightHasAnswers = right.summary.totalAnswers > 0;

  if (leftHasAnswers !== rightHasAnswers) {
    return leftHasAnswers ? -1 : 1;
  }

  return (
    left.summary.accuracy - right.summary.accuracy ||
    right.summary.incorrectCount +
      right.summary.partialCount -
      left.summary.incorrectCount -
      left.summary.partialCount ||
    compareEmployeeNames(left, right)
  );
}

function compareEmployeeNames(left: TeamAnalyticsEmployee, right: TeamAnalyticsEmployee) {
  return (
    left.user.displayName.localeCompare(right.user.displayName, 'ru-RU') ||
    left.user.login.localeCompare(right.user.login, 'ru-RU') ||
    left.user.id.localeCompare(right.user.id, 'ru-RU')
  );
}

function dateRank(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Нет активности';
  }

  return new Date(value).toLocaleString('ru-RU');
}

function formatGrowthTopic(topic: TeamAnalyticsGrowthTopic) {
  return `${topic.accuracy}% · ${topic.incorrectCount} incorrect / ${topic.partialCount} partial`;
}

function formatStackList(employee: TeamAnalyticsEmployee) {
  if (!employee.stacks.length) {
    return 'Стек не назначен';
  }

  return employee.stacks.map((stack) => stack.name).join(', ');
}

function getAccuracyTone(employee: TeamAnalyticsEmployee) {
  if (!employee.summary.totalAnswers) {
    return 'ready';
  }

  if (employee.summary.accuracy >= 75) {
    return 'success';
  }

  if (employee.summary.accuracy >= 50) {
    return 'warning';
  }

  return 'danger';
}

function getInitials(employee: TeamAnalyticsEmployee) {
  const source = employee.user.displayName.trim() || employee.user.login;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toLocaleUpperCase('ru-RU');
  }

  return source.slice(0, 2).toLocaleUpperCase('ru-RU');
}

onMounted(() => {
  void loadTeamAnalytics();
});
</script>

<template>
  <section class="page-frame">
    <section class="summary-strip metrics-grid metrics-grid--four">
      <article class="surface-card summary-stat">
        <span>Сотрудники</span>
        <strong>{{ summary.employeesCount }}</strong>
        <small>Активные USER-аккаунты</small>
      </article>

      <article class="surface-card summary-stat">
        <span>С данными</span>
        <strong>{{ summary.employeesWithAnswersCount }}</strong>
        <small>Есть ответы в тренировках или интервью</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Ответы</span>
        <strong>{{ summary.totalAnswers }}</strong>
        <small>Training + completed interviews</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Success</span>
        <strong>{{ summary.averageAccuracy }}%</strong>
        <small>Correct от всех ответов команды</small>
      </article>
    </section>

    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel class="toolbar-panel team-dashboard-toolbar" variant="toolbar">
      <div class="toolbar-panel__filters team-dashboard-filters">
        <UiField
          v-model="searchQuery"
          clearable
          label="Поиск сотрудника"
          placeholder="Имя, login или стек"
        />

        <UiSelect
          v-model="stackFilter"
          :items="stackOptions"
          item-title="title"
          item-value="value"
          label="Стек"
        />

        <UiSelect
          v-model="sortMode"
          :items="sortOptions"
          item-title="title"
          item-value="value"
          label="Сортировка"
        />
      </div>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton
            :icon="mdiRefresh"
            :loading="loading"
            tone="secondary"
            @click="loadTeamAnalytics"
          >
            Обновить
          </UiButton>
        </div>
      </div>
    </UiPanel>

    <UiPanel class="table-frame team-dashboard-panel" variant="table">
      <div class="table-frame__header">
        <span class="table-card__caption">{{ visibleEmployeesLabel }}</span>
      </div>

      <div class="table-frame__surface">
        <div v-if="loading && !analytics" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="employees.length" class="team-employee-list">
          <div class="list-head list-head--team-employees">
            <span>Сотрудник</span>
            <span>Стек</span>
            <span>Ответы</span>
            <span>Success</span>
            <span>Точки роста</span>
            <span>История</span>
          </div>

          <article
            v-for="employee in employees"
            :key="employee.user.id"
            class="list-row team-employee-row"
          >
            <div class="team-employee-cell">
              <span class="team-employee-avatar" aria-hidden="true">
                {{ getInitials(employee) }}
              </span>
              <div>
                <strong>{{ employee.user.displayName }}</strong>
                <p>{{ employee.user.login }}</p>
                <small>{{ formatDate(employee.summary.lastActivityAt) }}</small>
              </div>
            </div>

            <div class="team-stack-cell">
              <div v-if="employee.stacks.length" class="topic-stack">
                <v-chip
                  v-for="stack in employee.stacks"
                  :key="stack.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ stack.name }}
                </v-chip>
              </div>
              <span v-else class="muted-inline">Стек не назначен</span>
              <small>{{ formatStackList(employee) }}</small>
            </div>

            <div class="team-answer-cell">
              <strong>{{ employee.summary.totalAnswers }}</strong>
              <small>
                {{ employee.summary.correctCount }} correct /
                {{ employee.summary.partialCount }} partial /
                {{ employee.summary.incorrectCount }} incorrect
              </small>
              <small>
                {{ employee.summary.trainingSessionsCount }} training ·
                {{ employee.summary.completedInterviewsCount }} interviews ·
                {{ employee.summary.feedbackCount }} feedback
              </small>
            </div>

            <div class="team-success-cell">
              <span
                class="status-badge"
                :class="`status-badge--${getAccuracyTone(employee)}`"
              >
                {{ employee.summary.accuracy }}%
              </span>
              <v-progress-linear
                :model-value="employee.summary.accuracy"
                color="success"
                height="8"
                rounded
              />
            </div>

            <div class="team-growth-cell">
              <template v-if="employee.growthTopics.length">
                <article
                  v-for="topic in employee.growthTopics"
                  :key="topic.topicId"
                  class="team-growth-topic"
                >
                  <strong>{{ topic.name }}</strong>
                  <small>{{ formatGrowthTopic(topic) }}</small>
                </article>
              </template>
              <span v-else class="muted-inline">
                {{ employee.summary.totalAnswers ? 'Нет явных точек роста' : 'Нет данных' }}
              </span>
            </div>

            <div class="row-actions row-actions--compact team-history-cell">
              <UiButton
                :icon="mdiHistory"
                size="sm"
                tone="secondary"
                :to="{
                  name: 'employee-interview-history',
                  params: { userId: employee.user.id },
                }"
              >
                История
              </UiButton>
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Сотрудники не найдены</p>
          <span>Измени поиск или фильтр по стеку.</span>
        </div>
      </div>

      <div class="action-footer">
        <span>{{ visibleEmployeesLabel }}</span>
        <UiButton
          :icon="mdiAccountGroupOutline"
          :loading="loading"
          tone="text"
          @click="loadTeamAnalytics"
        >
          Обновить данные
        </UiButton>
      </div>
    </UiPanel>
  </section>
</template>
