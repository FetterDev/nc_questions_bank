<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { mdiPencilOutline, mdiPlus, mdiRefresh } from '@mdi/js';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import { apiService } from '../services/api.service';
import type { Topic } from '../features/topics/topics.types';
import { pageSizeOptions } from '../features/questions/questions.constants';
import { toUserErrorMessage } from '../features/system/error.utils';

type DialogMode = 'create' | 'edit';

const searchQuery = ref('');
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const topics = ref<Topic[]>([]);
const total = ref(0);
const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});
const pagination = reactive({
  page: 1,
  pageSize: 20,
});
const dialog = reactive({
  open: false,
  mode: 'create' as DialogMode,
  topicId: null as string | null,
  name: '',
});

const totalPages = computed(() => {
  const pages = Math.ceil(total.value / pagination.pageSize);
  return Math.max(1, pages || 1);
});

const visibleItemsRange = computed(() => {
  if (!total.value) {
    return '0 из 0';
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, total.value);
  return `${start}-${end} из ${total.value}`;
});

const dialogTitle = computed(() =>
  dialog.mode === 'create' ? 'Новая тема' : 'Переименование темы',
);

const dialogSubmitLabel = computed(() =>
  dialog.mode === 'create' ? 'Создать' : 'Сохранить',
);

const activeTopicsCount = computed(
  () => topics.value.filter((topic) => topic.questionsCount > 0).length,
);

const requiredNameRule = (value?: string) =>
  Boolean(value?.trim()) || 'Название обязательно';

let searchDebounceTimer: number | undefined;

function openCreateDialog() {
  dialog.open = true;
  dialog.mode = 'create';
  dialog.topicId = null;
  dialog.name = '';
}

function openEditDialog(topic: Topic) {
  dialog.open = true;
  dialog.mode = 'edit';
  dialog.topicId = topic.id;
  dialog.name = topic.name;
}

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

async function loadTopics() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await apiService.listTopics({
      q: searchQuery.value.trim() || undefined,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });

    topics.value = response.items;
    total.value = response.total;

    if (pagination.page > totalPages.value) {
      pagination.page = totalPages.value;
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить справочник тем.',
    );
  } finally {
    loading.value = false;
  }
}

async function saveTopic() {
  const name = dialog.name.trim();

  if (!name) {
    return;
  }

  saving.value = true;

  try {
    if (dialog.mode === 'create') {
      await apiService.createTopic({ name });
      pushToast('Тема создана.');
    } else if (dialog.topicId) {
      await apiService.updateTopic(dialog.topicId, { name });
      pushToast('Тема обновлена.');
    }

    dialog.open = false;
    await loadTopics();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось сохранить тему.'),
      'error',
    );
  } finally {
    saving.value = false;
  }
}

watch(
  () => searchQuery.value,
  () => {
    if (searchDebounceTimer) {
      window.clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = window.setTimeout(() => {
      if (pagination.page === 1) {
        void loadTopics();
        return;
      }

      pagination.page = 1;
    }, 240);
  },
);

watch(
  () => pagination.pageSize,
  () => {
    if (pagination.page === 1) {
      void loadTopics();
      return;
    }

    pagination.page = 1;
  },
);

watch(
  () => pagination.page,
  () => {
    void loadTopics();
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-frame">
    <section class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Всего тем</span>
        <strong>{{ total }}</strong>
        <small>Контролируемый словарь тем фронтенда</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Диапазон</span>
        <strong>{{ visibleItemsRange }}</strong>
        <small>Страница {{ pagination.page }} / {{ totalPages }}</small>
      </article>

      <article class="surface-card summary-stat">
        <span>В выборке</span>
        <strong>{{ activeTopicsCount }}</strong>
        <small>Темы с опубликованными вопросами на текущей странице</small>
      </article>
    </section>

    <UiPanel class="toolbar-panel" variant="toolbar">
      <div class="toolbar-panel__filters topics-controls-card">
        <UiField
          v-model="searchQuery"
          clearable
          label="Поиск темы"
          placeholder="Название или слаг"
        />

        <UiSelect
          v-model="pagination.pageSize"
          :items="pageSizeOptions"
          item-title="title"
          item-value="value"
          label="Строк на страницу"
        />
      </div>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton :icon="mdiRefresh" tone="secondary" @click="loadTopics">
            Обновить
          </UiButton>

          <UiButton :icon="mdiPlus" @click="openCreateDialog">
            Новая тема
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

    <UiPanel class="table-frame topics-list-panel" variant="table">
      <div class="table-frame__header">
        <span class="table-card__caption">{{ visibleItemsRange }}</span>
      </div>

      <div class="table-frame__surface">
        <div v-if="loading && !topics.length" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="topics.length" class="topic-admin-list">
          <div class="list-head list-head--topics">
            <span>Тема</span>
            <span>Слаг</span>
            <span>Вопросы</span>
            <span>Действия</span>
          </div>

          <article
            v-for="topic in topics"
            :key="topic.id"
            class="list-row topic-row"
          >
            <div class="topic-name-cell">
              <strong>{{ topic.name }}</strong>
              <p>{{ topic.questionsCount > 0 ? 'Используется в опубликованном банке' : 'Пока не используется' }}</p>
            </div>

            <div class="list-cell topic-slug-cell">
              {{ topic.slug }}
            </div>

            <div class="list-cell">
              <span class="status-badge status-badge--ready">
                {{ topic.questionsCount }}
              </span>
            </div>

            <div class="row-actions row-actions--compact">
              <UiIconButton
                :icon="mdiPencilOutline"
                label="Переименовать тему"
                title="Переименовать тему"
                @click="openEditDialog(topic)"
              />
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Темы не найдены</p>
          <span>Измени строку поиска или создай новую тему.</span>
        </div>
      </div>

      <div class="action-footer">
        <span>{{ visibleItemsRange }}</span>

        <v-pagination
          v-model="pagination.page"
          :length="totalPages"
          :total-visible="5"
          color="primary"
        />
      </div>
    </UiPanel>

    <v-dialog v-model="dialog.open" max-width="520">
      <UiPanel class="topics-dialog-card form-panel" padding="default" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ dialogTitle }}</h2>
          </div>

          <v-chip color="secondary" rounded="pill" variant="tonal">
            {{ dialog.mode === 'create' ? 'Создание' : 'Редактирование' }}
          </v-chip>
        </div>

        <div class="editor-form">
          <UiField
            v-model="dialog.name"
            required
            :rules="[requiredNameRule]"
            label="Название темы"
          />

          <div class="action-footer action-footer--end">
            <div class="action-footer__group">
              <UiButton tone="secondary" @click="dialog.open = false">
                Отмена
              </UiButton>

              <UiButton
                :loading="saving"
                @click="saveTopic"
              >
                {{ dialogSubmitLabel }}
              </UiButton>
            </div>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>
