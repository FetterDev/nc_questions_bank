<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import type {
  InterviewDetail,
  InterviewHistory,
} from '../features/interviews/interviews.types';
import { formatDateOnly, formatDateTime } from '../features/interviews/interviews.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import {
  formatTrainingResult,
  trainingResultColor,
} from '../features/training/training.utils';
import { apiService } from '../services/api.service';

const route = useRoute();
const router = useRouter();
const history = ref<InterviewHistory | null>(null);
const detail = ref<InterviewDetail | null>(null);
const loading = ref(false);
const detailLoading = ref(false);
const errorMessage = ref('');

const selectedUserId = computed(() =>
  typeof route.params.userId === 'string' ? route.params.userId : null,
);
const selectedId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : null,
);
const historyTitle = computed(() =>
  selectedUserId.value ? 'История сотрудника' : 'Завершённые интервью',
);

async function loadHistory() {
  loading.value = true;
  errorMessage.value = '';

  try {
    history.value = selectedUserId.value
      ? await apiService.listUserInterviewHistory(selectedUserId.value)
      : await apiService.listMyInterviewHistory();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить историю собеседований.',
    );
  } finally {
    loading.value = false;
  }
}

async function loadDetail(id: string | null) {
  if (!id) {
    detail.value = null;
    return;
  }

  detailLoading.value = true;
  errorMessage.value = '';

  try {
    detail.value = await apiService.getInterviewDetail(id);
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить детали собеседования.',
    );
  } finally {
    detailLoading.value = false;
  }
}

function openDetail(id: string) {
  if (selectedUserId.value) {
    void router.push({
      name: 'employee-interview-history-detail',
      params: { userId: selectedUserId.value, id },
    });
    return;
  }

  void router.push({ name: 'interview-history-detail', params: { id } });
}

watch(
  () => selectedId.value,
  (id) => {
    void loadDetail(id);
  },
  { immediate: true },
);

onMounted(() => {
  void loadHistory();
});

watch(
  () => selectedUserId.value,
  () => {
    void loadHistory();
  },
);
</script>

<template>
  <section class="page-frame">
    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <div class="split-workspace interview-history-layout">
      <UiPanel class="detail-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ historyTitle }}</h2>
          </div>
        </div>

        <div v-if="loading" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="history?.items.length" class="interview-row-list">
          <button
            v-for="item in history.items"
            :key="item.id"
            :class="[
              'interview-row-card',
              'interview-row-card--button',
              { 'interview-row-card--active': selectedId === item.id },
            ]"
            type="button"
            @click="openDetail(item.id)"
          >
            <div class="interview-row-card__copy">
              <strong>{{ item.interviewer.displayName }}</strong>
              <small>{{ formatDateOnly(item.plannedDate) }}</small>
            </div>
            <small>{{ item.correctCount }} / {{ item.partialCount }} / {{ item.incorrectCount }}</small>
          </button>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>История пуста</p>
        </div>
      </UiPanel>

      <UiPanel class="detail-panel" variant="detail">
        <div v-if="detailLoading" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="detail" class="interview-detail-stack">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ detail.interviewer.displayName }}</h2>
              <small>{{ formatDateTime(detail.interview.completedAt ?? '') }}</small>
            </div>
          </div>

          <div v-if="detail.feedback" class="interview-feedback-card">
            <strong>Финальный feedback</strong>
            <p>{{ detail.feedback }}</p>
          </div>

          <div v-if="detail.growthAreas" class="interview-feedback-card">
            <strong>Зоны роста</strong>
            <p>{{ detail.growthAreas }}</p>
          </div>

          <div v-if="detail.competencySummary.length" class="interview-competency-summary">
            <article
              v-for="item in detail.competencySummary"
              :key="item.competencyId"
              class="interview-feedback-card"
            >
              <strong>{{ item.name }}</strong>
              <small>{{ item.accuracy }}% · {{ item.correctCount }} / {{ item.partialCount }} / {{ item.incorrectCount }}</small>
            </article>
          </div>

          <article
            v-for="question in detail.questions"
            :key="question.id"
            class="interview-history-question"
          >
            <div class="interview-history-question__head">
              <DifficultyTag :difficulty="question.difficulty" />
              <v-chip
                v-if="question.result"
                :color="trainingResultColor(question.result)"
                size="small"
                variant="tonal"
              >
                {{ formatTrainingResult(question.result) }}
              </v-chip>
            </div>

            <QuestionContentRenderer :content="question.questionTextContent" />

            <div class="runtime-criteria-list">
              <article
                v-for="criterion in question.criteria"
                :key="criterion.id"
                class="runtime-criterion-card"
              >
                <div class="runtime-criterion-card__head">
                  <div>
                    <strong>{{ criterion.title }}</strong>
                    <p v-if="criterion.description">{{ criterion.description }}</p>
                  </div>
                  <v-chip
                    v-if="criterion.result"
                    :color="trainingResultColor(criterion.result)"
                    size="small"
                    variant="tonal"
                  >
                    {{ formatTrainingResult(criterion.result) }}
                  </v-chip>
                </div>
                <small v-if="criterion.comment">{{ criterion.comment }}</small>
                <small v-if="criterion.isGrowthPoint || criterion.growthArea">
                  Зона роста: {{ criterion.growthArea ?? 'зафиксирована по результату критерия' }}
                </small>
              </article>
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Выбери интервью</p>
        </div>
      </UiPanel>
    </div>

    <div class="action-footer">
      <UiButton
        tone="text"
        :to="selectedUserId ? { name: 'team-dashboard' } : { name: 'my-interviews-dashboard' }"
      >
        К статистике
      </UiButton>
    </div>
  </section>
</template>
