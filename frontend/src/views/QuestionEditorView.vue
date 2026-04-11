<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '../composables/useSession';
import { useQuestionEditorForm } from '../composables/useQuestionEditorForm';
import QuestionEditorPanel from '../components/questions/QuestionEditorPanel.vue';
import { difficultyOptions } from '../features/questions/questions.constants';

const route = useRoute();
const router = useRouter();
const { canManagePublishedQuestions } = useSession();
const {
  disabledForm,
  companyOptions,
  companiesLoading,
  ensureCompanyOptions,
  ensureTopicOptions,
  errorMessage,
  form,
  initializeForCreate,
  loadQuestion,
  loading,
  saving,
  submissionLockedReason,
  submit,
  topicOptions,
  topicsLoading,
  validationErrors,
} = useQuestionEditorForm();
const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});

const questionId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : null,
);
const mode = computed(() => (questionId.value ? 'edit' : 'create'));
const submitLabel = computed(() => {
  if (canManagePublishedQuestions.value) {
    return mode.value === 'create' ? 'Создать вопрос' : 'Сохранить изменения';
  }

  return mode.value === 'create' ? 'Отправить на проверку' : 'Отправить правку';
});
const submitTitle = computed(() =>
  canManagePublishedQuestions.value
    ? mode.value === 'create'
      ? 'Новый вопрос'
      : 'Редактирование вопроса'
    : mode.value === 'create'
      ? 'Новая заявка'
      : 'Правка вопроса',
);

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

async function loadEditorState(id: string | null) {
  if (!id) {
    await initializeForCreate();
    return;
  }

  try {
    await Promise.all([ensureTopicOptions(), ensureCompanyOptions(), loadQuestion(id)]);
  } catch (error) {
    pushToast(
      error instanceof Error ? error.message : 'Не удалось подготовить редактор.',
      'error',
    );
  }
}

async function submitEditor() {
  try {
    const result = await submit({
      mode: mode.value,
      questionId: questionId.value,
    });

    pushToast(result.toastMessage);

    if (result.kind === 'manager-created') {
      await router.replace({
        name: 'question-editor-edit',
        params: { id: result.question.id },
      });
      return;
    }

    if (result.kind === 'manager-updated') {
      return;
    }

    await router.replace({
      name: 'my-requests',
      query: { selected: result.requestId },
    });
  } catch (error) {
    pushToast(
      error instanceof Error ? error.message : 'Не удалось сохранить вопрос.',
      'error',
    );
  }
}

function openBank() {
  void router.push({ name: 'question-bank' });
}

watch(
  () => questionId.value,
  (id) => {
    void loadEditorState(id);
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-frame page-frame--narrow">
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-if="submissionLockedReason"
      color="secondary"
      type="warning"
      variant="tonal"
    >
      {{ submissionLockedReason }}
    </v-alert>

    <div class="editor-layout">
      <QuestionEditorPanel
        :cancel-label="'Назад к списку'"
        :companies-loading="companiesLoading"
        :company-options="companyOptions"
        :difficulty-options="difficultyOptions"
        :disabled="disabledForm"
        :form="form"
        :mode="mode"
        :question-content-error="validationErrors.textContent"
        :answer-content-error="validationErrors.answerContent"
        :saving="saving"
        :submit-label="submitLabel"
        :title="submitTitle"
        :topic-options="topicOptions"
        :topics-loading="topicsLoading"
        :topics-error="validationErrors.topicIds"
        @cancel="openBank"
        @submit="submitEditor"
      />
    </div>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>
