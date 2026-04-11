<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  mdiFileRefreshOutline,
  mdiFileUploadOutline,
  mdiLayersSearchOutline,
} from '@mdi/js';
import UiButton from '../ui/UiButton.vue';
import UiPanel from '../ui/UiPanel.vue';
import type {
  QuestionCsvImportReport,
  QuestionCsvImportRow,
} from '../../features/questions/questions-import.types';
import { formatDifficulty } from '../../features/questions/questions.utils';
import { toUserErrorMessage } from '../../features/system/error.utils';
import { apiService } from '../../services/api.service';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'committed'): void;
  (event: 'update:open', value: boolean): void;
}>();

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const report = ref<QuestionCsvImportReport | null>(null);
const previewLoading = ref(false);
const commitLoading = ref(false);
const errorMessage = ref('');
const showAllRows = ref(false);

const summaryCards = computed(() => {
  if (!report.value) {
    return [];
  }

  return [
    { label: 'Новых', value: report.value.totals.create, tone: 'create' },
    { label: 'Обновлений', value: report.value.totals.update, tone: 'update' },
    { label: 'Без изменений', value: report.value.totals.noChange, tone: 'neutral' },
    { label: 'Ошибок', value: report.value.totals.error, tone: 'error' },
  ];
});

const interestingRows = computed(() => {
  if (!report.value) {
    return [];
  }

  return report.value.rows.filter(
    (row) =>
      row.summary !== 'no_change' ||
      row.errors.length > 0 ||
      row.warnings.length > 0,
  );
});

const visibleRows = computed(() => {
  if (!report.value) {
    return [];
  }

  if (showAllRows.value) {
    return report.value.rows;
  }

  if (interestingRows.value.length > 0) {
    return interestingRows.value;
  }

  return report.value.rows.slice(0, 24);
});

const hiddenRowsCount = computed(() => {
  if (!report.value || showAllRows.value) {
    return 0;
  }

  return Math.max(0, report.value.rows.length - visibleRows.value.length);
});

const canCommit = computed(
  () =>
    Boolean(selectedFile.value) &&
    Boolean(report.value) &&
    report.value?.totals.error === 0 &&
    !previewLoading.value &&
    !commitLoading.value,
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetState();
    }
  },
);

function resetState() {
  selectedFile.value = null;
  report.value = null;
  errorMessage.value = '';
  showAllRows.value = false;

  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function openFilePicker() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const nextFile = target.files?.[0] ?? null;
  target.value = '';

  if (!nextFile) {
    return;
  }

  selectedFile.value = nextFile;
  await runPreview();
}

async function runPreview() {
  if (!selectedFile.value) {
    return;
  }

  previewLoading.value = true;
  errorMessage.value = '';
  showAllRows.value = false;

  try {
    report.value = await apiService.previewQuestionsCsvImport(selectedFile.value);
  } catch (error) {
    report.value = null;
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось построить preview импорта.',
    );
  } finally {
    previewLoading.value = false;
  }
}

async function runCommit() {
  if (!selectedFile.value) {
    return;
  }

  commitLoading.value = true;
  errorMessage.value = '';

  try {
    const result = await apiService.commitQuestionsCsvImport(selectedFile.value);
    report.value = result.report;

    if (result.status === 200 && result.report.applied) {
      emit('committed');
      openModel.value = false;
      return;
    }

    errorMessage.value = 'Импорт не применён. Исправь ошибки в файле и повтори загрузку.';
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось применить импорт.',
    );
  } finally {
    commitLoading.value = false;
  }
}

function rowStatusLabel(row: QuestionCsvImportRow) {
  if (row.summary === 'create') {
    return 'Создание';
  }

  if (row.summary === 'update') {
    return 'Обновление';
  }

  if (row.summary === 'no_change') {
    return 'Без изменений';
  }

  return 'Ошибка';
}

function rowStatusClass(row: QuestionCsvImportRow) {
  return `csv-import-row--${row.summary.replace('_', '-')}`;
}
</script>

<template>
  <v-dialog v-model="openModel" max-width="1080">
    <UiPanel class="csv-import-dialog" padding="default">
      <div class="csv-import-dialog__header">
        <div class="csv-import-dialog__intro">
          <h2>Импорт банка из CSV</h2>
          <p>
            Загрузи канонический CSV или legacy-файл. Система построит preview,
            покажет ошибки и только потом применит изменения.
          </p>
        </div>

        <div class="csv-import-dialog__header-actions">
          <UiButton
            :icon="mdiFileUploadOutline"
            tone="secondary"
            @click="openFilePicker"
          >
            Выбрать файл
          </UiButton>

          <UiButton
            v-if="selectedFile"
            :icon="mdiFileRefreshOutline"
            :loading="previewLoading"
            tone="secondary"
            @click="runPreview"
          >
            Обновить preview
          </UiButton>
        </div>
      </div>

      <div class="csv-import-dialog__file-strip">
        <div class="csv-import-dialog__file-copy">
          <span class="csv-import-dialog__eyebrow">Файл</span>
          <strong>{{ selectedFile?.name ?? 'Файл еще не выбран' }}</strong>
          <small v-if="report">
            Разделитель: {{ report.delimiter }}. Строк: {{ report.totals.totalRows }}.
          </small>
          <small v-else>
            Поддерживается только CSV. `xlsx` в v1 не импортируется.
          </small>
        </div>

        <UiButton
          :icon="mdiLayersSearchOutline"
          :loading="previewLoading"
          :disabled="!selectedFile"
          tone="secondary"
          @click="runPreview"
        >
          Построить preview
        </UiButton>
      </div>

      <input
        ref="fileInput"
        accept=".csv,text/csv"
        class="csv-import-dialog__input"
        type="file"
        @change="handleFileChange"
      >

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>

      <template v-if="report">
        <div class="csv-import-summary-grid">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            class="csv-import-summary-card"
            :class="`csv-import-summary-card--${card.tone}`"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </div>

        <div
          v-if="
            report.warnings.length ||
            report.topicsToCreate.length ||
            report.companiesToCreate.length
          "
          class="csv-import-meta-grid"
        >
          <UiPanel
            v-if="report.warnings.length"
            class="csv-import-meta-card"
            padding="compact"
            tone="muted"
          >
            <h3>Глобальные warning</h3>
            <p
              v-for="warning in report.warnings"
              :key="warning"
            >
              {{ warning }}
            </p>
          </UiPanel>

          <UiPanel
            v-if="report.topicsToCreate.length"
            class="csv-import-meta-card"
            padding="compact"
            tone="muted"
          >
            <h3>Новые темы</h3>
            <div class="csv-import-chip-list">
              <v-chip
                v-for="topic in report.topicsToCreate"
                :key="topic"
                color="secondary"
                size="small"
                variant="tonal"
              >
                {{ topic }}
              </v-chip>
            </div>
          </UiPanel>

          <UiPanel
            v-if="report.companiesToCreate.length"
            class="csv-import-meta-card"
            padding="compact"
            tone="muted"
          >
            <h3>Новые компании</h3>
            <div class="csv-import-chip-list">
              <v-chip
                v-for="company in report.companiesToCreate"
                :key="company"
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ company }}
              </v-chip>
            </div>
          </UiPanel>
        </div>

        <div class="csv-import-rows">
          <div class="csv-import-rows__header">
            <div>
              <h3>Строки preview</h3>
              <p>
                Показано {{ visibleRows.length }} из {{ report.rows.length }}.
              </p>
            </div>

            <UiButton
              v-if="hiddenRowsCount > 0"
              tone="text"
              @click="showAllRows = true"
            >
              Показать еще {{ hiddenRowsCount }}
            </UiButton>
          </div>

          <div class="csv-import-rows__list">
            <article
              v-for="row in visibleRows"
              :key="row.rowNumber"
              class="csv-import-row"
              :class="rowStatusClass(row)"
            >
              <div class="csv-import-row__head">
                <div class="csv-import-row__identity">
                  <span class="csv-import-row__eyebrow">Строка {{ row.rowNumber }}</span>
                  <strong>{{ rowStatusLabel(row) }}</strong>
                </div>

                <div class="csv-import-chip-list">
                  <v-chip
                    v-if="row.normalized.id"
                    size="small"
                    variant="outlined"
                  >
                    ID {{ row.normalized.id }}
                  </v-chip>

                  <v-chip
                    v-if="row.normalized.difficulty"
                    size="small"
                    variant="outlined"
                  >
                    {{ formatDifficulty(row.normalized.difficulty) }}
                  </v-chip>

                  <v-chip
                    v-if="row.normalized.company"
                    color="primary"
                    size="small"
                    variant="tonal"
                  >
                    {{ row.normalized.company }}
                  </v-chip>
                </div>
              </div>

              <p class="csv-import-row__question">
                {{ row.normalized.questionText || 'Пустой текст вопроса' }}
              </p>

              <div class="csv-import-chip-list">
                <v-chip
                  v-for="topic in row.normalized.topics"
                  :key="topic"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ topic }}
                </v-chip>
              </div>

              <div
                v-if="row.errors.length || row.warnings.length"
                class="csv-import-row__issues"
              >
                <p
                  v-for="issue in row.errors"
                  :key="`error-${row.rowNumber}-${issue}`"
                  class="csv-import-row__issue csv-import-row__issue--error"
                >
                  {{ issue }}
                </p>

                <p
                  v-for="issue in row.warnings"
                  :key="`warning-${row.rowNumber}-${issue}`"
                  class="csv-import-row__issue csv-import-row__issue--warning"
                >
                  {{ issue }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </template>

      <div class="csv-import-dialog__footer">
        <UiButton tone="text" @click="openModel = false">
          Закрыть
        </UiButton>

        <UiButton
          :disabled="!selectedFile"
          :loading="previewLoading"
          tone="secondary"
          @click="runPreview"
        >
          Preview
        </UiButton>

        <UiButton
          :disabled="!canCommit"
          :loading="commitLoading"
          @click="runCommit"
        >
          Применить импорт
        </UiButton>
      </div>
    </UiPanel>
  </v-dialog>
</template>
