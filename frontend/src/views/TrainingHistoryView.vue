<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiRunFast } from '@mdi/js';
import { useRoute, useRouter } from 'vue-router';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import type {
  TrainingHistoryDetail,
  TrainingHistorySession,
} from '../features/training/training.types';
import {
  formatTrainingResult,
  trainingResultColor,
} from '../features/training/training.utils';
import { formatDate } from '../features/questions/questions.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

const route = useRoute();
const router = useRouter();

const sessions = ref<TrainingHistorySession[]>([]);
const detail = ref<TrainingHistoryDetail | null>(null);
const loading = ref(false);
const detailLoading = ref(false);
const selectedId = ref<string | null>(null);
const errorMessage = ref('');

const summary = computed(() => ({
  total: sessions.value.length,
  completed: sessions.value.filter((item) => item.status === 'COMPLETED').length,
  withFeedback: sessions.value.filter((item) => Boolean(item.feedback)).length,
  external: sessions.value.filter((item) => item.trainer !== null).length,
}));

function formatSessionStatus(value: TrainingHistorySession['status']) {
  return value === 'COMPLETED' ? 'завершена' : 'сохранён выход';
}

function sessionStatusColor(value: TrainingHistorySession['status']) {
  return value === 'COMPLETED' ? 'success' : 'warning';
}

function trainerLabel(session: TrainingHistorySession) {
  return session.trainer?.displayName ?? 'Самостоятельная тренировка';
}

function trainerMeta(session: TrainingHistorySession) {
  return session.trainer?.login ?? 'self';
}

async function loadHistory() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await apiService.listTrainingHistory();
    sessions.value = response.items;

    const requestedId =
      typeof route.params.id === 'string' ? route.params.id : null;
    const nextId =
      requestedId && response.items.some((item) => item.id === requestedId)
        ? requestedId
        : response.items[0]?.id ?? null;

    if (nextId) {
      await selectSession(nextId, requestedId !== nextId);
      return;
    }

    detail.value = null;
    selectedId.value = null;

    if (requestedId) {
      void router.replace({ name: 'training-history' });
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить историю тренировок.',
    );
  } finally {
    loading.value = false;
  }
}

async function selectSession(id: string, syncUrl = true) {
  selectedId.value = id;
  detailLoading.value = true;

  if (syncUrl) {
    void router.replace({
      name: 'training-history-detail',
      params: { id },
    });
  }

  try {
    detail.value = await apiService.getTrainingHistoryDetail(id);
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить детали тренировки.',
    );
  } finally {
    detailLoading.value = false;
  }
}

watch(
  () => route.params.id,
  (value) => {
    const nextId = typeof value === 'string' ? value : null;

    if (nextId && nextId !== selectedId.value) {
      void selectSession(nextId, false);
    }
  },
);

void loadHistory();
</script>

<template>
  <section class="page-frame">
    <div class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Сессии</span>
        <strong>{{ summary.total }}</strong>
        <small>История текущего ученика</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Завершено</span>
        <strong>{{ summary.completed }}</strong>
        <small>Сессии со статусом completed</small>
      </article>

      <article class="surface-card summary-stat">
        <span>С фидбеком</span>
        <strong>{{ summary.withFeedback }}</strong>
        <small>Есть текстовый комментарий тренера</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Взаимные</span>
        <strong>{{ summary.external }}</strong>
        <small>Сессии, сохранённые другим пользователем</small>
      </article>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <div class="split-workspace training-history-layout">
      <UiPanel class="detail-panel training-history-list-card" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Сохранённые тренировки</h2>
          </div>
          <span class="table-card__caption">{{ sessions.length }} сессий</span>
        </div>

        <div v-if="sessions.length" class="training-history-list">
          <button
            v-for="session in sessions"
            :key="session.id"
            type="button"
            class="training-history-list__item"
            :class="{ 'training-history-list__item--active': session.id === selectedId }"
            @click="selectSession(session.id)"
          >
            <div class="training-history-list__head">
              <strong>{{ trainerLabel(session) }}</strong>
              <v-chip
                :color="sessionStatusColor(session.status)"
                size="small"
                variant="tonal"
              >
                {{ formatSessionStatus(session.status) }}
              </v-chip>
            </div>
            <p>{{ trainerMeta(session) }} · {{ formatDate(session.finishedAt) }}</p>
            <small>
              {{ session.correctCount }} correct · {{ session.partialCount }} partial · {{ session.incorrectCount }} incorrect
            </small>
          </button>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>{{ loading ? 'Загрузка' : 'История пуста' }}</p>
          <span>Сохрани тренировку, чтобы здесь появился список сессий.</span>
          <div class="empty-state__actions">
            <UiButton :icon="mdiRunFast" :to="{ name: 'training' }" size="lg">
              Открыть тренировку
            </UiButton>
          </div>
        </div>
      </UiPanel>

      <UiPanel class="detail-panel training-history-detail-card" variant="detail">
        <div v-if="detail" class="detail-stack">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ trainerLabel(detail) }}</h2>
              <small>{{ formatDate(detail.finishedAt) }}</small>
            </div>
            <v-chip
              :color="sessionStatusColor(detail.status)"
              size="small"
              variant="tonal"
            >
              {{ formatSessionStatus(detail.status) }}
            </v-chip>
          </div>

          <div class="metrics-grid">
            <article class="surface-card summary-stat">
              <span>Correct</span>
              <strong>{{ detail.correctCount }}</strong>
              <small>Полностью засчитано</small>
            </article>

            <article class="surface-card summary-stat">
              <span>Partial</span>
              <strong>{{ detail.partialCount }}</strong>
              <small>Частично засчитано</small>
            </article>

            <article class="surface-card summary-stat">
              <span>Incorrect</span>
              <strong>{{ detail.incorrectCount }}</strong>
              <small>Не засчитано</small>
            </article>
          </div>

          <UiPanel
            v-if="detail.feedback"
            class="training-history-feedback"
            padding="default"
            variant="detail"
          >
            <div class="panel-copy">
              <strong>Комментарий тренера</strong>
            </div>
            <p>{{ detail.feedback }}</p>
          </UiPanel>

          <div class="training-history-results">
            <article
              v-for="item in detail.results"
              :key="`${detail.id}:${item.questionId}:${item.position}`"
              class="training-history-result-card"
            >
              <div class="training-history-result-card__head">
                <div class="training-history-result-card__meta">
                  <span>#{{ item.position + 1 }}</span>
                  <DifficultyTag :difficulty="item.difficulty" />
                </div>
                <v-chip
                  :color="trainingResultColor(item.result)"
                  size="small"
                  variant="tonal"
                >
                  {{ formatTrainingResult(item.result) }}
                </v-chip>
              </div>

              <QuestionContentRenderer
                class="training-history-result-card__title"
                compact
                :content="item.textContent"
              />

              <div class="topic-stack">
                <v-chip
                  v-for="topic in item.topics"
                  :key="topic.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ topic.name }}
                </v-chip>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>{{ detailLoading ? 'Загрузка' : 'Сессия не выбрана' }}</p>
          <span>Выбери тренировку слева, чтобы открыть snapshot результатов.</span>
        </div>
      </UiPanel>
    </div>
  </section>
</template>

<style scoped>
.training-history-layout {
  align-items: stretch;
}

.training-history-list-card,
.training-history-detail-card {
  min-height: 640px;
}

.training-history-list {
  display: grid;
  gap: 12px;
}

.training-history-list__item {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--panel-border);
  border-radius: calc(var(--panel-radius) - 4px);
  background: color-mix(in srgb, var(--color-paper) 92%, var(--color-ivory));
  text-align: left;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.training-history-list__item:hover {
  border-color: color-mix(in srgb, var(--color-accent-cyan) 42%, var(--panel-border));
  transform: translateY(-1px);
}

.training-history-list__item--active {
  border-color: color-mix(in srgb, var(--color-accent-cyan) 58%, var(--panel-border));
  box-shadow: var(--shadow-overlay);
}

.training-history-list__head,
.training-history-result-card__head,
.training-history-result-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.training-history-list__item p,
.training-history-list__item small,
.training-history-feedback p {
  margin: 0;
}

.training-history-results {
  display: grid;
  gap: 12px;
}

.training-history-result-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--panel-border);
  border-radius: calc(var(--panel-radius) - 4px);
  background: color-mix(in srgb, var(--color-paper) 94%, var(--color-ivory));
}

.training-history-result-card__meta {
  justify-content: flex-start;
}

.training-history-result-card__title {
  color: var(--color-ink);
}

@media (max-width: 900px) {
  .training-history-list__head,
  .training-history-result-card__head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
