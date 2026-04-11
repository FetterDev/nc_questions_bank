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
};

const route = useRoute();
const router = useRouter();

const runtime = ref<InterviewRuntime | null>(null);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const activeIndex = ref(0);
const results = ref<RuntimeState[]>([]);

const currentItem = computed(() => runtime.value?.items[activeIndex.value] ?? null);
const answeredCount = computed(() => results.value.filter((item) => item.result !== null).length);
const canSubmit = computed(() =>
  runtime.value !== null &&
  runtime.value.items.length > 0 &&
  answeredCount.value === runtime.value.items.length,
);
const currentResult = computed(
  () => results.value.find((item) => item.id === currentItem.value?.id)?.result ?? null,
);

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
      items: results.value.map((item) => ({
        interviewQuestionId: item.id,
        result: item.result ?? 'incorrect',
      })),
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

          <div class="training-focus-card__actions">
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
