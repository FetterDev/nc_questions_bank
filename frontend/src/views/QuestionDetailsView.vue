<script setup lang="ts">
import { mdiArrowLeft, mdiPencilOutline } from '@mdi/js';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { useSession } from '../composables/useSession';
import type { Question } from '../features/questions/questions.types';
import { formatDate } from '../features/questions/questions.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

const route = useRoute();
const router = useRouter();
const {
  canManagePublishedQuestions,
  canSubmitQuestionChangeRequests,
  isUser,
} = useSession();

const question = ref<Question | null>(null);
const loading = ref(false);
const encounterBusy = ref(false);
const errorMessage = ref('');
const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});

const questionId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : null,
);

const canEdit = computed(() =>
  Boolean(question.value) &&
  (canManagePublishedQuestions.value || canSubmitQuestionChangeRequests.value) &&
  !question.value?.pendingChangeRequest.hasPendingChangeRequest,
);

const encounterChecked = computed(() =>
  question.value?.interviewEncounter.checkedByCurrentUser ?? false,
);

const encounterCountLabel = computed(() => {
  const count = question.value?.interviewEncounter.count ?? 0;
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} раз`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} раза`;
  }

  return `${count} раз`;
});

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

async function loadQuestion(id: string) {
  loading.value = true;
  errorMessage.value = '';

  try {
    question.value = await apiService.getQuestion(id);
  } catch (error) {
    question.value = null;
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить вопрос.',
    );
  } finally {
    loading.value = false;
  }
}

function openBank() {
  void router.push({ name: 'question-bank' });
}

function openEditor() {
  if (!question.value || !canEdit.value) {
    return;
  }

  void router.push({
    name: 'question-editor-edit',
    params: { id: question.value.id },
  });
}

async function handleEncounterToggle(nextValue: boolean | null) {
  if (!question.value || encounterBusy.value || nextValue === null) {
    return;
  }

  const previous = question.value.interviewEncounter;
  encounterBusy.value = true;

  try {
    const interviewEncounter = nextValue
      ? await apiService.markQuestionInterviewEncounter(question.value.id)
      : await apiService.unmarkQuestionInterviewEncounter(question.value.id);

    question.value = {
      ...question.value,
      interviewEncounter,
    };
  } catch (error) {
    question.value = {
      ...question.value,
      interviewEncounter: previous,
    };
    pushToast(
      toUserErrorMessage(error, 'Не удалось обновить отметку.'),
      'error',
    );
  } finally {
    encounterBusy.value = false;
  }
}

watch(
  () => questionId.value,
  (id) => {
    if (!id) {
      question.value = null;
      errorMessage.value = 'Не найден id вопроса.';
      return;
    }

    void loadQuestion(id);
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-frame page-frame--narrow">
    <div class="action-footer">
      <UiButton :icon="mdiArrowLeft" tone="secondary" @click="openBank">
        Назад к банку
      </UiButton>

      <UiButton
        v-if="canEdit"
        :disabled="!canEdit"
        :icon="mdiPencilOutline"
        @click="openEditor"
      >
        {{ canManagePublishedQuestions ? 'Редактировать' : 'Отправить правку' }}
      </UiButton>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading && !question" class="empty-state empty-state-panel" variant="detail">
      <p>Загрузка</p>
    </UiPanel>

    <template v-else-if="question">
      <section class="summary-strip metrics-grid">
        <article class="surface-card summary-stat">
          <span>Компания</span>
          <strong>{{ question.company?.name ?? 'Не указана' }}</strong>
          <small>Опциональная привязка к интервью в компании</small>
        </article>

        <article class="surface-card summary-stat">
          <span>Обновлён</span>
          <strong>{{ formatDate(question.updatedAt) }}</strong>
          <small>Последняя опубликованная версия</small>
        </article>

        <article class="surface-card summary-stat">
          <span>Встречал на собесе</span>
          <strong>{{ encounterCountLabel }}</strong>
          <small>Общий счётчик отметок по пользователям</small>
        </article>
      </section>

      <UiPanel class="detail-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ question.text }}</h2>
          </div>

          <DifficultyTag :difficulty="question.difficulty" />
        </div>

        <v-alert
          v-if="question.pendingChangeRequest.hasPendingChangeRequest"
          color="secondary"
          type="warning"
          variant="tonal"
        >
          По вопросу уже есть активная заявка. Пока она не обработана, редактирование заблокировано.
        </v-alert>

        <div class="detail-stack">
          <section class="form-section">
            <div class="question-dialog__encounter">
              <div class="question-dialog__encounter-copy">
                <span class="section-label">Встречал на собесе</span>
                <strong>{{ encounterCountLabel }}</strong>
              </div>

              <v-switch
                v-if="isUser"
                :disabled="encounterBusy"
                hide-details
                :loading="encounterBusy"
                :model-value="encounterChecked"
                inset
                label="Отметить для себя"
                @update:model-value="handleEncounterToggle"
              />
            </div>
          </section>

          <section class="form-section">
            <p class="section-label">Вопрос</p>
            <article class="editor-preview-card">
              <QuestionContentRenderer :content="question.textContent" />
            </article>
          </section>

          <section class="form-section">
            <p class="section-label">Ответ</p>
            <article class="editor-preview-card">
              <QuestionContentRenderer :content="question.answerContent" />
            </article>
          </section>

          <section class="form-section">
            <p class="section-label">Контекст</p>

            <div class="question-dialog__meta">
              <v-chip
                v-if="question.company"
                color="primary"
                variant="tonal"
              >
                {{ question.company.name }}
              </v-chip>

              <div class="topic-grid">
                <v-chip
                  v-for="topic in question.topics"
                  :key="topic.id"
                  color="secondary"
                  variant="tonal"
                >
                  {{ topic.name }}
                </v-chip>
              </div>
            </div>
          </section>
        </div>
      </UiPanel>
    </template>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>
