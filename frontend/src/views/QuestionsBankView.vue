<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DeleteQuestionDialog from '../components/questions/DeleteQuestionDialog.vue';
import QuestionCsvImportDialog from '../components/questions/QuestionCsvImportDialog.vue';
import QuestionsHero from '../components/questions/QuestionsHero.vue';
import QuestionsTable from '../components/questions/QuestionsTable.vue';
import QuestionsToolbar from '../components/questions/QuestionsToolbar.vue';
import { useQuestionsDesk } from '../composables/useQuestionsDesk';
import {
  difficultyOptions,
  pageSizeOptions,
} from '../features/questions/questions.constants';
import type { Question } from '../features/questions/questions.types';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

const router = useRouter();
const route = useRoute();

const {
  askDelete,
  canCreateQuestionLike,
  canManagePublishedQuestions,
  canManageQuestionBankCsv,
  createLabel,
  confirmDelete,
  deleteDialog,
  deleting,
  difficultyFilterLabel,
  errorMessage,
  lastSyncedAt,
  loadQuestions,
  loading,
  pagination,
  pushToast,
  questions,
  searchState,
  snackbar,
  topicOptions,
  topicsLoading,
  totalPages,
  visibleItemsRange,
} = useQuestionsDesk();

const csvExporting = ref(false);
const importDialogOpen = ref(false);

const activeSort = computed(() =>
  searchState.query.trim() ? 'relevance' : 'newest',
);

function openCreateRoute() {
  void router.push({ name: 'question-editor-create' });
}

function openQuestionPreview(question: Question) {
  void router.push({
    name: 'question-details',
    params: { id: question.id },
  });
}

function openEditDialog(question: Question) {
  void router.push({
    name: 'question-editor-edit',
    params: { id: question.id },
  });
}

function openImportDialog() {
  importDialogOpen.value = true;
}

async function exportCsv() {
  if (!canManageQuestionBankCsv.value || csvExporting.value) {
    return;
  }

  csvExporting.value = true;

  try {
    const exported = await apiService.exportQuestionsCsv({
      q: searchState.query.trim() || undefined,
      companyQuery: searchState.companyQuery.trim() || undefined,
      difficulty:
        searchState.difficulty === null ? undefined : [searchState.difficulty],
      topicIds: searchState.topicIds.length > 0 ? searchState.topicIds : undefined,
      sort: activeSort.value,
    });
    const objectUrl = window.URL.createObjectURL(exported.blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = exported.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
    pushToast('Экспорт CSV готов.');
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось выгрузить CSV.'),
      'error',
    );
  } finally {
    csvExporting.value = false;
  }
}

async function handleCsvImported() {
  pushToast('Импорт CSV применён.');
  await loadQuestions();
}

watch(
  () => [route.query.q, route.query.company],
  ([queryValue, companyValue]) => {
    const nextQuery = typeof queryValue === 'string' ? queryValue : '';
    const nextCompany = typeof companyValue === 'string' ? companyValue : '';

    if (searchState.query !== nextQuery) {
      searchState.query = nextQuery;
    }

    if (searchState.companyQuery !== nextCompany) {
      searchState.companyQuery = nextCompany;
    }
  },
  { immediate: true },
);

watch(
  () => [searchState.query, searchState.companyQuery],
  ([queryValue, companyValue]) => {
    const normalizedQuery = queryValue.trim();
    const normalizedCompany = companyValue.trim();
    const currentQuery = typeof route.query.q === 'string' ? route.query.q : '';
    const currentCompany =
      typeof route.query.company === 'string' ? route.query.company : '';

    if (
      normalizedQuery === currentQuery &&
      normalizedCompany === currentCompany
    ) {
      return;
    }

    void router.replace({
      name: 'question-bank',
      query: {
        ...(normalizedQuery ? { q: normalizedQuery } : {}),
        ...(normalizedCompany ? { company: normalizedCompany } : {}),
      },
    });
  },
);
</script>

<template>
  <section class="page-frame">
    <QuestionsHero
      :difficulty-filter-label="difficultyFilterLabel"
      :last-synced-at="lastSyncedAt"
      :page="pagination.page"
      :total="pagination.total"
      :total-pages="totalPages"
      :visible-items-range="visibleItemsRange"
    />

    <QuestionsToolbar
      :can-manage-csv="canManageQuestionBankCsv"
      :can-open-create="canCreateQuestionLike"
      :company-query="searchState.companyQuery"
      :create-label="createLabel"
      :csv-exporting="csvExporting"
      :difficulty="searchState.difficulty"
      :difficulty-options="difficultyOptions"
      :error-message="errorMessage"
      :page-size="pagination.pageSize"
      :page-size-options="pageSizeOptions"
      :query="searchState.query"
      :topic-ids="searchState.topicIds"
      :topic-options="topicOptions"
      :topics-loading="topicsLoading"
      @export-csv="exportCsv"
      @open-import="openImportDialog"
      @open-create="openCreateRoute"
      @refresh="loadQuestions"
      @update:company-query="searchState.companyQuery = $event"
      @update:difficulty="searchState.difficulty = $event"
      @update:page-size="pagination.pageSize = $event"
      @update:query="searchState.query = $event"
      @update:topic-ids="searchState.topicIds = $event"
    />

    <QuestionsTable
      :can-manage-published-questions="canManagePublishedQuestions"
      :loading="loading"
      :page="pagination.page"
      :questions="questions"
      :total-pages="totalPages"
      :visible-items-range="visibleItemsRange"
      @delete="askDelete"
      @edit="openEditDialog"
      @open="openQuestionPreview"
      @update:page="pagination.page = $event"
    />

    <DeleteQuestionDialog
      v-model:open="deleteDialog.open"
      :confirm-label="deleteDialog.confirmLabel"
      :deleting="deleting"
      :hint="deleteDialog.hint"
      :question-title="deleteDialog.questionTitle"
      @confirm="confirmDelete"
    />

    <QuestionCsvImportDialog
      v-model:open="importDialogOpen"
      @committed="handleCsvImported"
    />

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>
