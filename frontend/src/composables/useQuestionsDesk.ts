import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useSession } from './useSession';
import { apiService } from '../services/api.service';
import { difficultyOptions } from '../features/questions/questions.constants';
import type {
  DifficultyValue,
  Question,
  SearchResponse,
} from '../features/questions/questions.types';
import type { Topic } from '../features/topics/topics.types';
import { toUserErrorMessage } from '../features/system/error.utils';

export function useQuestionsDesk() {
  const {
    canManagePublishedQuestions,
    canManageQuestionBankCsv,
    canSubmitQuestionChangeRequests,
  } = useSession();
  const searchState = reactive({
    query: '',
    companyQuery: '',
    difficulty: null as DifficultyValue | null,
    topicIds: [] as string[],
  });

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const deleteDialog = reactive({
    confirmLabel: '',
    hint: '',
    open: false,
    questionId: null as string | null,
    questionTitle: '',
  });

  const questionDialog = reactive({
    open: false,
    startInEditMode: false,
  });

  const snackbar = reactive({
    open: false,
    text: '',
    color: 'success' as 'success' | 'error',
  });

  const questions = ref<Question[]>([]);
  const selectedQuestion = ref<Question | null>(null);
  const topicOptions = ref<Topic[]>([]);
  const loading = ref(false);
  const topicsLoading = ref(false);
  const deleting = ref(false);
  const errorMessage = ref('');
  const lastSyncedAt = ref('');

  const totalPages = computed(() => {
    const pages = Math.ceil(pagination.total / pagination.pageSize);
    return Math.max(1, pages || 1);
  });

  const visibleItemsRange = computed(() => {
    if (!pagination.total) {
      return '0 из 0';
    }

    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `${start}-${end} из ${pagination.total}`;
  });

  const activeSort = computed(() =>
    searchState.query.trim() ? 'relevance' : 'newest',
  );

  const createLabel = computed(() =>
    canManagePublishedQuestions.value ? 'Новый вопрос' : 'Новая заявка',
  );

  const canCreateQuestionLike = computed(
    () => canManagePublishedQuestions.value || canSubmitQuestionChangeRequests.value,
  );

  const difficultyFilterLabel = computed(() => {
    return (
      difficultyOptions.find((option) => option.value === searchState.difficulty)
        ?.title ?? 'Все уровни'
    );
  });

  let requestCounter = 0;
  let searchDebounceTimer: number | undefined;

  function pushToast(text: string, color: 'success' | 'error' = 'success') {
    snackbar.text = text;
    snackbar.color = color;
    snackbar.open = true;
  }

  function resetToFirstPageOrReload() {
    if (pagination.page === 1) {
      void loadQuestions();
      return;
    }

    pagination.page = 1;
  }

  function askDelete(question: Question) {
    deleteDialog.confirmLabel = canManagePublishedQuestions.value
      ? 'Удалить'
      : 'Отправить заявку';
    deleteDialog.hint = canManagePublishedQuestions.value
      ? 'Операция необратима.'
      : 'Опубликованный вопрос останется в банке, пока менеджер не одобрит удаление.';
    deleteDialog.questionId = question.id;
    deleteDialog.questionTitle = question.text;
    deleteDialog.open = true;
  }

  function openQuestionDialog(question: Question, startInEditMode = false) {
    selectedQuestion.value = question;
    questionDialog.startInEditMode = startInEditMode;
    questionDialog.open = true;
  }

  function closeQuestionDialog() {
    questionDialog.open = false;
    questionDialog.startInEditMode = false;
    selectedQuestion.value = null;
  }

  function applyQuestionUpdate(updatedQuestion: Question) {
    questions.value = questions.value.map((question) =>
      question.id === updatedQuestion.id ? updatedQuestion : question,
    );

    if (selectedQuestion.value?.id === updatedQuestion.id) {
      selectedQuestion.value = updatedQuestion;
    }
  }

  async function loadQuestions() {
    const requestId = ++requestCounter;
    loading.value = true;
    errorMessage.value = '';

    try {
      const response: SearchResponse = await apiService.searchQuestions({
        q: searchState.query.trim() || undefined,
        companyQuery: searchState.companyQuery.trim() || undefined,
        difficulty:
          searchState.difficulty === null ? undefined : [searchState.difficulty],
        topicIds: searchState.topicIds.length > 0 ? searchState.topicIds : undefined,
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        sort: activeSort.value,
      });

      if (requestId !== requestCounter) {
        return;
      }

      questions.value = response.items;
      pagination.total = response.total;
      lastSyncedAt.value = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (selectedQuestion.value) {
        selectedQuestion.value =
          response.items.find((item) => item.id === selectedQuestion.value?.id) ?? null;

        if (!selectedQuestion.value) {
          questionDialog.open = false;
          questionDialog.startInEditMode = false;
        }
      }

      if (pagination.page > totalPages.value) {
        pagination.page = totalPages.value;
      }
    } catch (error) {
      if (requestId !== requestCounter) {
        return;
      }

      errorMessage.value = toUserErrorMessage(
        error,
        'Не удалось загрузить вопросы.',
      );
    } finally {
      if (requestId === requestCounter) {
        loading.value = false;
      }
    }
  }

  async function loadTopicOptions() {
    topicsLoading.value = true;

    try {
      topicOptions.value = await apiService.listAllTopics({
        usedOnly: true,
      });
    } catch (error) {
      pushToast(
        toUserErrorMessage(error, 'Не удалось загрузить темы для фильтра.'),
        'error',
      );
    } finally {
      topicsLoading.value = false;
    }
  }

  async function confirmDelete() {
    if (!deleteDialog.questionId) {
      return;
    }

    deleting.value = true;

    try {
      if (canManagePublishedQuestions.value) {
        await apiService.deleteQuestion(deleteDialog.questionId);
      } else {
        await apiService.createQuestionChangeRequest({
          type: 'DELETE',
          targetQuestionId: deleteDialog.questionId,
        });
      }

      deleteDialog.open = false;

      if (questions.value.length === 1 && pagination.page > 1) {
        pagination.page -= 1;
      }

      pushToast(
        canManagePublishedQuestions.value
          ? 'Вопрос удалён.'
          : 'Заявка на удаление отправлена.',
      );
      await loadQuestions();
    } catch (error) {
      pushToast(
        toUserErrorMessage(error, 'Не удалось выполнить действие.'),
        'error',
      );
    } finally {
      deleting.value = false;
    }
  }

  watch(
    [() => searchState.query, () => searchState.companyQuery],
    () => {
      if (searchDebounceTimer) {
        window.clearTimeout(searchDebounceTimer);
      }

      searchDebounceTimer = window.setTimeout(() => {
        resetToFirstPageOrReload();
      }, 320);
    },
  );

  watch(
    [
      () => searchState.difficulty,
      () => pagination.pageSize,
      () => searchState.topicIds.join(','),
    ],
    () => {
      resetToFirstPageOrReload();
    },
  );

  watch(
    () => pagination.page,
    () => {
      void loadQuestions();
    },
  );

  onMounted(() => {
    void loadTopicOptions();
    void loadQuestions();
  });

  onBeforeUnmount(() => {
    if (searchDebounceTimer) {
      window.clearTimeout(searchDebounceTimer);
    }
  });

  return {
    createLabel,
    canCreateQuestionLike,
    canManagePublishedQuestions,
    canManageQuestionBankCsv,
    canSubmitQuestionChangeRequests,
    deleteDialog,
    deleting,
    difficultyFilterLabel,
    errorMessage,
    applyQuestionUpdate,
    closeQuestionDialog,
    lastSyncedAt,
    loading,
    openQuestionDialog,
    pagination,
    pushToast,
    questionDialog,
    questions,
    searchState,
    selectedQuestion,
    snackbar,
    topicOptions,
    topicsLoading,
    totalPages,
    visibleItemsRange,
    askDelete,
    confirmDelete,
    loadQuestions,
    loadTopicOptions,
  };
}
