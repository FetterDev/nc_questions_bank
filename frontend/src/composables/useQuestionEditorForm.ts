import { computed, reactive, ref, watch } from 'vue';
import { useSession } from './useSession';
import { apiService } from '../services/api.service';
import { createEmptyForm } from '../features/questions/questions.constants';
import {
  QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
  QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
  ensureQuestionStructuredContent,
  normalizeQuestionStructuredContent,
  normalizeTopicIds,
} from '../features/questions/questions.utils';
import type {
  EditorMode,
  Question,
  QuestionFormValues,
} from '../features/questions/questions.types';
import type { Company } from '../features/companies/companies.types';
import type { Competency } from '../features/competencies/competencies.types';
import type { Topic } from '../features/topics/topics.types';
import { toUserErrorMessage } from '../features/system/error.utils';

type SubmitParams = {
  mode: EditorMode;
  questionId?: string | null;
};

export type QuestionEditorSubmitResult =
  | {
      kind: 'manager-created';
      question: Question;
      toastMessage: string;
    }
  | {
      kind: 'manager-updated';
      question: Question;
      toastMessage: string;
    }
  | {
      kind: 'user-request';
      requestId: string;
      toastMessage: string;
    };

export function useQuestionEditorForm() {
  const { canManagePublishedQuestions } = useSession();

  const form = reactive<QuestionFormValues>(createEmptyForm());
  const companyOptions = ref<Company[]>([]);
  const competencyOptions = ref<Competency[]>([]);
  const topicOptions = ref<Topic[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const companiesLoading = ref(false);
  const competenciesLoading = ref(false);
  const topicsLoading = ref(false);
  const errorMessage = ref('');
  const submissionLockedReason = ref('');
  const validationErrors = reactive({
    textContent: '',
    answerContent: '',
    evaluationCriteria: '',
    topicIds: '',
  });

  const disabledForm = computed(
    () => loading.value || saving.value || Boolean(submissionLockedReason.value),
  );

  let topicsPromise: Promise<Topic[]> | null = null;
  let companiesPromise: Promise<Company[]> | null = null;
  let competenciesPromise: Promise<Competency[]> | null = null;
  let loadCounter = 0;

  function resetForm() {
    Object.assign(form, createEmptyForm());
    submissionLockedReason.value = '';
    errorMessage.value = '';
    clearValidationErrors();
  }

  function clearValidationErrors() {
    validationErrors.textContent = '';
    validationErrors.answerContent = '';
    validationErrors.evaluationCriteria = '';
    validationErrors.topicIds = '';
  }

  function hydrateFromQuestion(question: Question) {
    form.textContent = ensureQuestionStructuredContent(
      question.textContent,
      question.text,
    );
    form.answerContent = ensureQuestionStructuredContent(
      question.answerContent,
      question.answer,
    );
    form.difficulty = question.difficulty as QuestionFormValues['difficulty'];
    form.companyId = question.company?.id ?? null;
    form.topicIds = question.topics.map((topic) => topic.id);
    form.competencyIds = question.competencies.map((competency) => competency.id);
    form.evaluationCriteria = question.evaluationCriteria.map((criterion) => ({
      title: criterion.title,
      description: criterion.description ?? '',
      competencyId: criterion.competency?.id ?? null,
      weight: criterion.weight,
    }));
    submissionLockedReason.value = question.pendingChangeRequest.hasPendingChangeRequest
      ? 'По этому вопросу уже есть активная pending-заявка. До её разрешения прямые изменения недоступны.'
      : '';
    errorMessage.value = '';
    clearValidationErrors();
  }

  async function ensureTopicOptions(force = false) {
    if (!force && topicOptions.value.length > 0) {
      return topicOptions.value;
    }

    if (!force && topicsPromise) {
      return topicsPromise;
    }

    topicsLoading.value = true;

    const request = apiService
      .listAllTopics()
      .then((topics) => {
        topicOptions.value = topics;
        return topics;
      })
      .catch((error) => {
        throw new Error(
          toUserErrorMessage(error, 'Не удалось загрузить темы для редактора.'),
        );
      })
      .finally(() => {
        topicsLoading.value = false;
        topicsPromise = null;
      });

    topicsPromise = request;
    return request;
  }

  async function ensureCompanyOptions(force = false) {
    if (!force && companyOptions.value.length > 0) {
      return companyOptions.value;
    }

    if (!force && companiesPromise) {
      return companiesPromise;
    }

    companiesLoading.value = true;

    const request = apiService
      .listAllCompanies()
      .then((companies) => {
        companyOptions.value = companies;
        return companies;
      })
      .catch((error) => {
        throw new Error(
          toUserErrorMessage(error, 'Не удалось загрузить компании для редактора.'),
        );
      })
      .finally(() => {
        companiesLoading.value = false;
        companiesPromise = null;
      });

    companiesPromise = request;
    return request;
  }

  async function ensureCompetencyOptions(force = false) {
    if (!force && competencyOptions.value.length > 0) {
      return competencyOptions.value;
    }

    if (!force && competenciesPromise) {
      return competenciesPromise;
    }

    competenciesLoading.value = true;

    const request = apiService
      .listAllCompetencies()
      .then((competencies) => {
        competencyOptions.value = competencies;
        return competencies;
      })
      .catch((error) => {
        throw new Error(
          toUserErrorMessage(error, 'Не удалось загрузить компетенции для редактора.'),
        );
      })
      .finally(() => {
        competenciesLoading.value = false;
        competenciesPromise = null;
      });

    competenciesPromise = request;
    return request;
  }

  async function loadQuestion(id: string) {
    const requestId = ++loadCounter;
    loading.value = true;
    errorMessage.value = '';

    try {
      const question = await apiService.getQuestion(id);

      if (requestId !== loadCounter) {
        return null;
      }

      hydrateFromQuestion(question);
      return question;
    } catch (error) {
      if (requestId !== loadCounter) {
        return null;
      }

      errorMessage.value = toUserErrorMessage(
        error,
        'Не удалось подготовить редактор.',
      );
      return null;
    } finally {
      if (requestId === loadCounter) {
        loading.value = false;
      }
    }
  }

  async function initializeForCreate() {
    loading.value = true;
    errorMessage.value = '';
    resetForm();

    try {
      await Promise.all([
        ensureTopicOptions(),
        ensureCompanyOptions(),
        ensureCompetencyOptions(),
      ]);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Не удалось подготовить справочники.';
    } finally {
      loading.value = false;
    }
  }

  function validateForm() {
    let isValid = true;

    try {
      form.textContent = normalizeQuestionStructuredContent(form.textContent, {
        fieldLabel: 'Вопрос',
        plainTextLimit: QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
      });
      validationErrors.textContent = '';
    } catch (error) {
      validationErrors.textContent =
        error instanceof Error ? error.message : 'Заполните вопрос.';
      isValid = false;
    }

    try {
      form.answerContent = normalizeQuestionStructuredContent(form.answerContent, {
        fieldLabel: 'Ответ',
        plainTextLimit: QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
      });
      validationErrors.answerContent =
        '';
    } catch (error) {
      validationErrors.answerContent =
        error instanceof Error ? error.message : 'Заполните ответ.';
      isValid = false;
    }

    const topicIds = normalizeTopicIds(form.topicIds);

    if (topicIds.length === 0) {
      validationErrors.topicIds = 'Нужна хотя бы одна тема.';
      isValid = false;
    } else {
      form.topicIds = topicIds;
      validationErrors.topicIds = '';
    }

    const selectedCompetencyIds = new Set(form.competencyIds);
    const criteria = form.evaluationCriteria
      .map((criterion) => ({
        ...criterion,
        title: criterion.title.trim(),
        description: criterion.description.trim(),
        competencyId: criterion.competencyId || null,
        weight: Number(criterion.weight),
      }))
      .filter((criterion) => criterion.title || criterion.description || criterion.competencyId);

    if (criteria.length > 12) {
      validationErrors.evaluationCriteria = 'Максимум 12 критериев.';
      isValid = false;
    } else if (criteria.some((criterion) => !criterion.title)) {
      validationErrors.evaluationCriteria = 'У каждого критерия должно быть название.';
      isValid = false;
    } else if (
      criteria.some(
        (criterion) =>
          criterion.competencyId && !selectedCompetencyIds.has(criterion.competencyId),
      )
    ) {
      validationErrors.evaluationCriteria =
        'Компетенция критерия должна быть выбрана в списке компетенций вопроса.';
      isValid = false;
    } else {
      form.evaluationCriteria = criteria;
      validationErrors.evaluationCriteria = '';
    }

    return isValid;
  }

  async function submit({ mode, questionId }: SubmitParams): Promise<QuestionEditorSubmitResult> {
    if (submissionLockedReason.value) {
      throw new Error(submissionLockedReason.value);
    }

    if (!validateForm()) {
      throw new Error('Проверь форму вопроса.');
    }

    const payload = {
      textContent: form.textContent,
      answerContent: form.answerContent,
      difficulty: form.difficulty,
      companyId: form.companyId,
      topicIds: normalizeTopicIds(form.topicIds),
      competencyIds: form.competencyIds,
      evaluationCriteria: form.evaluationCriteria.map((criterion) => ({
        title: criterion.title,
        description: criterion.description || null,
        competencyId: criterion.competencyId,
        weight: criterion.weight,
      })),
    };

    saving.value = true;

    try {
      if (canManagePublishedQuestions.value) {
        if (mode === 'create') {
          const created = await apiService.createQuestion(payload);
          return {
            kind: 'manager-created',
            question: created,
            toastMessage: 'Вопрос создан.',
          };
        }

        if (!questionId) {
          throw new Error('Не найден id вопроса.');
        }

        const updated = await apiService.updateQuestion(questionId, payload);
        return {
          kind: 'manager-updated',
          question: updated,
          toastMessage: 'Изменения сохранены.',
        };
      }

      const created = await apiService.createQuestionChangeRequest({
        type: mode === 'create' ? 'CREATE' : 'UPDATE',
        targetQuestionId: questionId ?? undefined,
        payload,
      });

      return {
        kind: 'user-request',
        requestId: created.id,
        toastMessage:
          mode === 'create'
            ? 'Заявка на новый вопрос отправлена.'
            : 'Заявка на изменение отправлена.',
      };
    } catch (error) {
      throw new Error(
        toUserErrorMessage(error, 'Не удалось сохранить вопрос.'),
      );
    } finally {
      saving.value = false;
    }
  }

  watch(
    () => form.textContent,
    () => {
      validationErrors.textContent = '';
    },
    { deep: true },
  );

  watch(
    () => form.answerContent,
    () => {
      validationErrors.answerContent = '';
    },
    { deep: true },
  );

  watch(
    () => form.topicIds,
    () => {
      validationErrors.topicIds = '';
    },
    { deep: true },
  );

  watch(
    () => form.evaluationCriteria,
    () => {
      validationErrors.evaluationCriteria = '';
    },
    { deep: true },
  );

  return {
    disabledForm,
    companyOptions,
    companiesLoading,
    competencyOptions,
    competenciesLoading,
    errorMessage,
    ensureCompanyOptions,
    ensureCompetencyOptions,
    form,
    hydrateFromQuestion,
    initializeForCreate,
    ensureTopicOptions,
    loadQuestion,
    loading,
    resetForm,
    saving,
    submissionLockedReason,
    submit,
    topicOptions,
    topicsLoading,
    validationErrors,
  };
}
