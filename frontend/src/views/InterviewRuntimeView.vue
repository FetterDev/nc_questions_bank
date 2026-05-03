<script setup lang="ts">
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiCheck,
  mdiClose,
  mdiMinus,
} from '@mdi/js';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { formatDateOnly } from '../features/interviews/interviews.utils';
import {
  formatTrainingResult,
  trainingResultColor,
} from '../features/training/training.utils';
import type {
  CompleteInterviewPayload,
  InterviewRuntime,
} from '../features/interviews/interviews.types';
import type { TrainingResultValue } from '../features/training/training.types';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

type RuntimeState = {
  id: string;
  result: TrainingResultValue | null;
  criteria: Array<{
    id: string;
    result: TrainingResultValue | null;
    comment: string;
    isGrowthPoint: boolean;
    growthArea: string;
  }>;
};

const route = useRoute();
const router = useRouter();

const runtime = ref<InterviewRuntime | null>(null);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const activeIndex = ref(0);
const results = ref<RuntimeState[]>([]);
const feedback = ref('');
const growthAreas = ref('');

const currentItem = computed(() => runtime.value?.items[activeIndex.value] ?? null);
const answeredCount = computed(() => results.value.filter((item) => isQuestionAnswered(item)).length);
const canSubmit = computed(() =>
  runtime.value !== null &&
  runtime.value.items.length > 0 &&
  answeredCount.value === runtime.value.items.length,
);
const currentState = computed(
  () => results.value.find((item) => item.id === currentItem.value?.id) ?? null,
);
const currentResult = computed(
  () => currentState.value ? deriveStateResult(currentState.value) : null,
);
const currentCriteriaRows = computed(() => {
  if (!currentItem.value || !currentState.value) {
    return [];
  }

  return currentItem.value.criteria.flatMap((criterion) => {
    const state = currentState.value?.criteria.find((item) => item.id === criterion.id);
    return state ? [{ criterion, state }] : [];
  });
});

async function loadRuntime() {
  const id = typeof route.params.id === 'string' ? route.params.id : '';

  if (!id) {
    errorMessage.value = 'Interview id отсутствует.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await apiService.getInterviewRuntime(id);
    runtime.value = response;
    results.value = response.items.map((item) => ({
      id: item.id,
      result: null,
      criteria: item.criteria.map((criterion) => ({
        id: criterion.id,
        result: null,
        comment: '',
        isGrowthPoint: false,
        growthArea: '',
      })),
    }));
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось открыть runtime собеседования.',
    );
  } finally {
    loading.value = false;
  }
}

function selectCriterionResult(criterionId: string, result: TrainingResultValue) {
  const item = currentItem.value;

  if (!item) {
    return;
  }

  results.value = results.value.map((entry) =>
    entry.id === item.id
      ? {
          ...entry,
          criteria: entry.criteria.map((criterion) =>
            criterion.id === criterionId
              ? {
                  ...criterion,
                  result,
                }
              : criterion,
          ),
        }
      : entry,
  );
}

function selectResult(result: TrainingResultValue) {
  const item = currentItem.value;

  if (!item) {
    return;
  }

  results.value = results.value.map((entry) =>
    entry.id === item.id
      ? {
          ...entry,
          result,
        }
      : entry,
  );
}

function goToPrevious() {
  if (activeIndex.value > 0) {
    activeIndex.value -= 1;
  }
}

function goToNext() {
  if (runtime.value && activeIndex.value < runtime.value.items.length - 1) {
    activeIndex.value += 1;
  }
}

async function submit() {
  const id = typeof route.params.id === 'string' ? route.params.id : '';

  if (!id || !canSubmit.value) {
    return;
  }

  saving.value = true;

  try {
    const payload: CompleteInterviewPayload = {
      feedback: feedback.value.trim() || undefined,
      items: results.value.map((item) => ({
        interviewQuestionId: item.id,
        result: deriveStateResult(item) ?? 'incorrect',
        criteriaResults: item.criteria.map((criterion) => ({
          criterionId: criterion.id,
          result: criterion.result ?? 'incorrect',
          comment: criterion.comment.trim() || undefined,
          isGrowthPoint: criterion.isGrowthPoint,
          growthArea: criterion.growthArea.trim() || undefined,
        })),
      })),
      growthAreas: growthAreas.value.trim() || undefined,
    };
    await apiService.completeInterview(id, payload);
    void router.push({ name: 'my-interviews' });
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось завершить собеседование.',
    );
  } finally {
    saving.value = false;
  }
}

function isQuestionAnswered(item: RuntimeState) {
  if (item.criteria.length > 0) {
    return item.criteria.every((criterion) => criterion.result !== null);
  }

  return item.result !== null;
}

function deriveStateResult(item: RuntimeState): TrainingResultValue | null {
  if (item.criteria.length === 0) {
    return item.result;
  }

  if (item.criteria.some((criterion) => criterion.result === null)) {
    return null;
  }

  if (item.criteria.some((criterion) => criterion.result === 'incorrect')) {
    return 'incorrect';
  }

  if (item.criteria.every((criterion) => criterion.result === 'correct')) {
    return 'correct';
  }

  return 'partial';
}

void loadRuntime();
</script>

<template>
  <section class="page-frame training-arena">
    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading || !runtime || !currentItem" class="empty-state empty-state-panel" variant="empty">
      <p>{{ loading ? 'Загрузка' : 'Runtime недоступен' }}</p>
    </UiPanel>

    <section v-else class="training-session-shell interview-runtime-shell">
      <div class="training-session-shell__topbar">
        <div class="training-session-shell__copy">
          <h2>{{ runtime.counterpart.displayName }}</h2>
          <small>{{ formatDateOnly(runtime.interview.plannedDate) }} · {{ answeredCount }} из {{ runtime.items.length }}</small>
        </div>

        <div class="training-session-shell__topbar-actions">
          <DifficultyTag :difficulty="currentItem.difficulty" />
          <v-chip
            v-if="currentResult"
            :color="trainingResultColor(currentResult)"
            size="small"
            variant="tonal"
          >
            {{ formatTrainingResult(currentResult) }}
          </v-chip>
        </div>
      </div>

      <div class="training-session-stage">
        <UiButton
          class="training-session-stage__nav"
          :icon="mdiArrowLeft"
          size="lg"
          tone="secondary"
          @click="goToPrevious"
        />

        <article class="training-focus-card">
          <div class="training-focus-card__body">
            <p class="section-label">Вопрос {{ activeIndex + 1 }}</p>
            <QuestionContentRenderer :content="currentItem.questionTextContent" />
          </div>

          <UiPanel class="detail-panel" variant="detail">
            <div class="panel-copy">
              <p class="section-label">Ответ-ориентир</p>
            </div>
            <QuestionContentRenderer :content="currentItem.answerContent" />
          </UiPanel>

          <div class="topic-stack">
            <v-chip
              v-for="topic in currentItem.topics"
              :key="topic.id"
              color="secondary"
              size="small"
              variant="tonal"
            >
              {{ topic.name }}
            </v-chip>
          </div>

          <div
            v-if="currentCriteriaRows.length"
            class="runtime-criteria-list"
          >
            <article
              v-for="row in currentCriteriaRows"
              :key="row.criterion.id"
              class="runtime-criterion-card"
            >
              <div class="runtime-criterion-card__head">
                <div>
                  <strong>{{ row.criterion.title }}</strong>
                  <p v-if="row.criterion.description">{{ row.criterion.description }}</p>
                </div>

                <v-chip
                  v-if="row.criterion.competency"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ row.criterion.competency.name }}
                </v-chip>
              </div>

              <div class="training-focus-card__actions">
                <UiButton
                  :icon="mdiCheck"
                  :tone="row.state.result === 'correct' ? 'primary' : 'secondary'"
                  @click="selectCriterionResult(row.criterion.id, 'correct')"
                >
                  Correct
                </UiButton>
                <UiButton
                  :icon="mdiMinus"
                  :tone="row.state.result === 'partial' ? 'primary' : 'secondary'"
                  @click="selectCriterionResult(row.criterion.id, 'partial')"
                >
                  Partial
                </UiButton>
                <UiButton
                  :icon="mdiClose"
                  :tone="row.state.result === 'incorrect' ? 'primary' : 'text'"
                  @click="selectCriterionResult(row.criterion.id, 'incorrect')"
                >
                  Incorrect
                </UiButton>
              </div>

              <UiField
                v-model="row.state.comment"
                hide-label
                label="Комментарий"
                placeholder="Комментарий по критерию"
                textarea
              />

              <v-checkbox
                v-model="row.state.isGrowthPoint"
                color="primary"
                density="compact"
                hide-details
                label="Точка роста"
              />

              <UiField
                v-model="row.state.growthArea"
                hide-label
                label="Зона роста"
                placeholder="Что нужно подтянуть по этому навыку"
                textarea
              />
            </article>
          </div>

          <div v-else class="training-focus-card__actions">
            <UiButton :icon="mdiCheck" @click="selectResult('correct')">Correct</UiButton>
            <UiButton :icon="mdiMinus" tone="secondary" @click="selectResult('partial')">Partial</UiButton>
            <UiButton :icon="mdiClose" tone="text" @click="selectResult('incorrect')">Incorrect</UiButton>
          </div>
        </article>

        <UiButton
          class="training-session-stage__nav"
          :icon="mdiArrowRight"
          size="lg"
          tone="secondary"
          @click="goToNext"
        />
      </div>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiField
            v-model="feedback"
            class="interview-runtime-feedback"
            hide-label
            label="Финальный feedback"
            placeholder="Финальный feedback по собеседованию"
            textarea
          />
          <UiField
            v-model="growthAreas"
            class="interview-runtime-feedback"
            hide-label
            label="Зоны роста"
            placeholder="Общие зоны роста кандидата"
            textarea
          />
          <UiButton tone="text" :to="{ name: 'my-interviews' }">
            Назад
          </UiButton>
          <UiButton :loading="saving" :disabled="!canSubmit" @click="submit">
            Завершить собеседование
          </UiButton>
        </div>
      </div>
    </section>
  </section>
</template>
