<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiPencilOutline } from '@mdi/js';
import { useQuestionEditorForm } from '../../composables/useQuestionEditorForm';
import { apiService } from '../../services/api.service';
import type { Question } from '../../features/questions/questions.types';
import type { DifficultyOption } from '../../features/questions/questions.types';
import DifficultyTag from './DifficultyTag.vue';
import QuestionContentRenderer from './QuestionContentRenderer.vue';
import QuestionEditorPanel from './QuestionEditorPanel.vue';
import UiButton from '../ui/UiButton.vue';
import UiPanel from '../ui/UiPanel.vue';

const props = defineProps<{
  difficultyOptions: DifficultyOption[];
  canManagePublishedQuestions: boolean;
  open: boolean;
  question: Question | null;
  startInEditMode: boolean;
}>();

const emit = defineEmits<{
  (event: 'notify', payload: { color: 'success' | 'error'; text: string }): void;
  (event: 'question-updated', question: Question): void;
  (event: 'refresh'): void;
  (event: 'update:open', value: boolean): void;
}>();

const {
  companyOptions,
  companiesLoading,
  competencyOptions,
  competenciesLoading,
  disabledForm,
  ensureCompanyOptions,
  ensureCompetencyOptions,
  ensureTopicOptions,
  errorMessage,
  form,
  hydrateFromQuestion,
  saving,
  submissionLockedReason,
  submit,
  topicOptions,
  topicsLoading,
  validationErrors,
} = useQuestionEditorForm();

const mode = ref<'view' | 'edit'>('view');
const encounterBusy = ref(false);
const localQuestion = ref<Question | null>(null);

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const canEdit = computed(() =>
  Boolean(localQuestion.value) &&
  !localQuestion.value?.pendingChangeRequest.hasPendingChangeRequest,
);

const encounterChecked = computed(() =>
  localQuestion.value?.interviewEncounter.checkedByCurrentUser ?? false,
);

const encounterCountLabel = computed(() => {
  const count = localQuestion.value?.interviewEncounter.count ?? 0;
  return `${count} ${pluralizeTimes(count)}`;
});

const dialogTitle = computed(() =>
  mode.value === 'view'
    ? 'Вопрос'
    : props.canManagePublishedQuestions
      ? 'Редактирование вопроса'
      : 'Правка вопроса',
);

const editSubmitLabel = computed(() =>
  props.canManagePublishedQuestions ? 'Сохранить изменения' : 'Отправить правку',
);

function pluralizeTimes(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'раз';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'раза';
  }

  return 'раз';
}

function syncLocalQuestion(question: Question | null) {
  localQuestion.value = question;

  if (question) {
    hydrateFromQuestion(question);
  }
}

async function openInMode(nextMode: 'view' | 'edit') {
  mode.value = nextMode;

  if (nextMode === 'edit' && localQuestion.value) {
    hydrateFromQuestion(localQuestion.value);

    try {
      await Promise.all([
        ensureTopicOptions(),
        ensureCompanyOptions(),
        ensureCompetencyOptions(),
      ]);
    } catch (error) {
      emit('notify', {
        color: 'error',
        text: error instanceof Error ? error.message : 'Не удалось загрузить темы.',
      });
    }
  }
}

function closeDialog() {
  openModel.value = false;
  mode.value = 'view';
  localQuestion.value = null;
}

async function switchToEditMode() {
  if (!localQuestion.value || !canEdit.value) {
    return;
  }

  await openInMode('edit');
}

function switchToViewMode() {
  if (localQuestion.value) {
    hydrateFromQuestion(localQuestion.value);
  }

  mode.value = 'view';
}

async function handleEncounterToggle(nextValue: boolean | null) {
  if (!localQuestion.value || encounterBusy.value || nextValue === null) {
    return;
  }

  const previous = localQuestion.value.interviewEncounter;
  encounterBusy.value = true;

  try {
    const interviewEncounter = nextValue
      ? await apiService.markQuestionInterviewEncounter(localQuestion.value.id)
      : await apiService.unmarkQuestionInterviewEncounter(localQuestion.value.id);

    const updatedQuestion = {
      ...localQuestion.value,
      interviewEncounter,
    };

    localQuestion.value = updatedQuestion;
    emit('question-updated', updatedQuestion);
  } catch (error) {
    localQuestion.value = {
      ...localQuestion.value,
      interviewEncounter: previous,
    };
    emit('notify', {
      color: 'error',
      text: error instanceof Error ? error.message : 'Не удалось обновить отметку.',
    });
  } finally {
    encounterBusy.value = false;
  }
}

async function submitEdit() {
  if (!localQuestion.value) {
    return;
  }

  try {
    const result = await submit({
      mode: 'edit',
      questionId: localQuestion.value.id,
    });

    emit('notify', {
      color: 'success',
      text: result.toastMessage,
    });

    if (result.kind === 'manager-updated') {
      localQuestion.value = result.question;
      emit('question-updated', result.question);
      mode.value = 'view';
      return;
    }

    openModel.value = false;
    emit('refresh');
  } catch (error) {
    emit('notify', {
      color: 'error',
      text: error instanceof Error ? error.message : 'Не удалось сохранить вопрос.',
    });
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      closeDialog();
      return;
    }

    syncLocalQuestion(props.question);
    void openInMode(props.startInEditMode ? 'edit' : 'view');
  },
);

watch(
  () => props.question,
  (question) => {
    if (!props.open || mode.value === 'edit') {
      return;
    }

    syncLocalQuestion(question);
  },
);
</script>

<template>
  <v-dialog v-model="openModel" max-width="1040">
    <QuestionEditorPanel
      v-if="localQuestion && mode === 'edit'"
      :answer-content-error="validationErrors.answerContent"
      cancel-label="Вернуться к просмотру"
      :companies-loading="companiesLoading"
      :company-options="companyOptions"
      :competencies-error="validationErrors.evaluationCriteria"
      :competencies-loading="competenciesLoading"
      :competency-options="competencyOptions"
      :difficulty-options="difficultyOptions"
      :disabled="disabledForm"
      :form="form"
      mode="edit"
      :question-content-error="validationErrors.textContent"
      :saving="saving"
      :submit-label="editSubmitLabel"
      :title="dialogTitle"
      :topic-options="topicOptions"
      :topics-error="validationErrors.topicIds"
      :topics-loading="topicsLoading"
      @cancel="switchToViewMode"
      @submit="submitEdit"
    />

    <UiPanel
      v-else-if="localQuestion"
      class="question-dialog detail-panel"
      padding="default"
      variant="detail"
    >
      <div class="panel-header question-dialog__header">
        <div class="panel-copy">
          <h2>{{ dialogTitle }}</h2>
        </div>

        <UiButton
          :disabled="!canEdit"
          :icon="mdiPencilOutline"
          tone="secondary"
          @click="switchToEditMode"
        >
          Редактировать
        </UiButton>
      </div>

      <v-alert
        v-if="submissionLockedReason"
        color="secondary"
        type="warning"
        variant="tonal"
      >
        {{ submissionLockedReason }}
      </v-alert>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>

      <div class="question-dialog__body">
        <section class="form-section">
          <div class="question-dialog__encounter">
            <div class="question-dialog__encounter-copy">
              <span class="section-label">Встречал на собесе</span>
              <strong>{{ encounterCountLabel }}</strong>
            </div>

            <v-switch
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
            <QuestionContentRenderer :content="localQuestion.textContent" />
          </article>
        </section>

        <section class="form-section">
          <p class="section-label">Ответ</p>
          <article class="editor-preview-card">
            <QuestionContentRenderer :content="localQuestion.answerContent" />
          </article>
        </section>

        <section class="form-section">
          <p class="section-label">Сложность и темы</p>

          <div class="question-dialog__meta">
            <DifficultyTag :difficulty="localQuestion.difficulty" />

            <v-chip
              v-if="localQuestion.company"
              color="primary"
              variant="tonal"
            >
              {{ localQuestion.company.name }}
            </v-chip>

            <div class="topic-grid">
              <v-chip
                v-for="topic in localQuestion.topics"
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
  </v-dialog>
</template>
