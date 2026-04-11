<script setup lang="ts">
import { computed } from 'vue';
import {
  mdiDownloadOutline,
  mdiFileUploadOutline,
  mdiMagnify,
  mdiPlus,
  mdiRefresh,
} from '@mdi/js';
import UiAutocomplete from '../ui/UiAutocomplete.vue';
import UiButton from '../ui/UiButton.vue';
import UiField from '../ui/UiField.vue';
import UiPanel from '../ui/UiPanel.vue';
import UiSelect from '../ui/UiSelect.vue';
import type {
  DifficultyOption,
  DifficultyValue,
  PageSizeOption,
} from '../../features/questions/questions.types';
import type { Topic } from '../../features/topics/topics.types';

const props = defineProps<{
  canManageCsv: boolean;
  canOpenCreate: boolean;
  companyQuery: string;
  createLabel: string;
  csvExporting: boolean;
  difficulty: DifficultyValue | null;
  difficultyOptions: DifficultyOption[];
  errorMessage: string;
  pageSize: number;
  pageSizeOptions: PageSizeOption[];
  query: string;
  topicIds: string[];
  topicOptions: Topic[];
  topicsLoading: boolean;
}>();

const emit = defineEmits<{
  (event: 'export-csv'): void;
  (event: 'open-import'): void;
  (event: 'open-create'): void;
  (event: 'refresh'): void;
  (event: 'update:companyQuery', value: string): void;
  (event: 'update:difficulty', value: DifficultyValue | null): void;
  (event: 'update:pageSize', value: number): void;
  (event: 'update:query', value: string): void;
  (event: 'update:topicIds', value: string[]): void;
}>();

const queryModel = computed({
  get: () => props.query,
  set: (value: string | null) => emit('update:query', value ?? ''),
});

const companyQueryModel = computed({
  get: () => props.companyQuery,
  set: (value: string | null) => emit('update:companyQuery', value ?? ''),
});

const difficultyModel = computed({
  get: () => props.difficulty,
  set: (value: DifficultyValue | null) => emit('update:difficulty', value),
});

const topicIdsModel = computed({
  get: () => props.topicIds,
  set: (value: string[] | null) => emit('update:topicIds', value ?? []),
});

const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (value: number | null) => {
    if (value) {
      emit('update:pageSize', value);
    }
  },
});
</script>

<template>
  <UiPanel class="toolbar-panel" variant="toolbar">
    <div class="toolbar-panel__filters filters-grid">
      <UiField
        v-model="queryModel"
        label="Поиск"
        placeholder="Текст вопроса или ответ"
        clearable
      >
        <template #prepend-inner>
          <v-icon :icon="mdiMagnify" />
        </template>
      </UiField>

      <UiField
        v-model="companyQueryModel"
        clearable
        label="Компания"
        placeholder="Например, Google"
      />

      <UiSelect
        v-model="difficultyModel"
        :items="difficultyOptions"
        label="Сложность"
        clearable
        placeholder="Все уровни"
      />

      <UiAutocomplete
        v-model="topicIdsModel"
        :items="topicOptions"
        :loading="topicsLoading"
        chips
        clearable
        closable-chips
        item-title="name"
        item-value="id"
        label="Темы"
        multiple
        no-data-text="Темы не найдены"
        placeholder="Все темы"
      />

      <UiSelect
        v-model="pageSizeModel"
        :items="pageSizeOptions"
        label="Строк на страницу"
      />
    </div>

    <div class="action-footer action-footer--end">
      <div class="action-footer__group">
        <UiButton
          :icon="mdiRefresh"
          tone="secondary"
          @click="$emit('refresh')"
        >
          Обновить
        </UiButton>

        <UiButton
          v-if="canManageCsv"
          :icon="mdiDownloadOutline"
          :loading="csvExporting"
          tone="secondary"
          @click="$emit('export-csv')"
        >
          Экспорт CSV
        </UiButton>

        <UiButton
          v-if="canManageCsv"
          :icon="mdiFileUploadOutline"
          tone="secondary"
          @click="$emit('open-import')"
        >
          Импорт CSV
        </UiButton>

        <UiButton
          v-if="canOpenCreate"
          :icon="mdiPlus"
          @click="$emit('open-create')"
        >
          {{ createLabel }}
        </UiButton>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>
  </UiPanel>
</template>
