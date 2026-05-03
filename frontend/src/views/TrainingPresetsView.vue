<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiDeleteOutline,
  mdiPencilOutline,
  mdiPlus,
  mdiRefresh,
  mdiTrayRemove,
} from '@mdi/js';
import UiAutocomplete from '../components/ui/UiAutocomplete.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { apiService } from '../services/api.service';
import { formatDate } from '../features/questions/questions.utils';
import type {
  TrainingPreset,
  TrainingPresetFormValues,
} from '../features/training/training.types';
import type { Topic } from '../features/topics/topics.types';
import { toUserErrorMessage } from '../features/system/error.utils';

type DialogMode = 'create' | 'edit';

const presets = ref<TrainingPreset[]>([]);
const topicOptions = ref<Topic[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const errorMessage = ref('');
const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});
const dialog = reactive({
  open: false,
  mode: 'create' as DialogMode,
  presetId: null as string | null,
  values: {
    name: '',
    topicIds: [] as string[],
  } satisfies TrainingPresetFormValues,
  topicPickerId: null as string | null,
});
const deleteDialog = reactive({
  open: false,
  presetId: null as string | null,
  name: '',
});

const topicsById = computed(
  () => new Map(topicOptions.value.map((topic) => [topic.id, topic])),
);

const dialogTitle = computed(() =>
  dialog.mode === 'create' ? 'Новый пресет' : 'Редактирование пресета',
);

const totalLinkedTopics = computed(() =>
  presets.value.reduce((sum, preset) => sum + preset.topics.length, 0),
);

const uniqueTopicsCount = computed(
  () => new Set(presets.value.flatMap((preset) => preset.topics.map((topic) => topic.id))).size,
);

const orderedDialogTopics = computed(() =>
  dialog.values.topicIds
    .map((topicId) => topicsById.value.get(topicId))
    .filter((topic): topic is Topic => Boolean(topic)),
);

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

async function loadData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const [fetchedPresets, fetchedTopics] = await Promise.all([
      apiService.listTrainingPresets(),
      apiService.listAllTopics(),
    ]);

    presets.value = fetchedPresets;
    topicOptions.value = fetchedTopics;
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить пресеты тренировок.',
    );
  } finally {
    loading.value = false;
  }
}

function resetDialog() {
  dialog.open = false;
  dialog.mode = 'create';
  dialog.presetId = null;
  dialog.values = {
    name: '',
    topicIds: [],
  };
  dialog.topicPickerId = null;
}

function openCreateDialog() {
  resetDialog();
  dialog.open = true;
}

function openEditDialog(preset: TrainingPreset) {
  dialog.open = true;
  dialog.mode = 'edit';
  dialog.presetId = preset.id;
  dialog.values = {
    name: preset.name,
    topicIds: preset.topics.map((topic) => topic.id),
  };
  dialog.topicPickerId = null;
}

function addTopicToDialog() {
  if (!dialog.topicPickerId) {
    return;
  }

  if (dialog.values.topicIds.includes(dialog.topicPickerId)) {
    pushToast('Тема уже есть в пресете.', 'error');
    return;
  }

  dialog.values.topicIds = [...dialog.values.topicIds, dialog.topicPickerId];
  dialog.topicPickerId = null;
}

function removeTopicFromDialog(topicId: string) {
  dialog.values.topicIds = dialog.values.topicIds.filter((id) => id !== topicId);
}

function moveTopic(topicId: string, direction: -1 | 1) {
  const next = [...dialog.values.topicIds];
  const index = next.findIndex((id) => id === topicId);
  const targetIndex = index + direction;

  if (index === -1 || targetIndex < 0 || targetIndex >= next.length) {
    return;
  }

  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  dialog.values.topicIds = next;
}

async function savePreset() {
  saving.value = true;

  try {
    const body = {
      name: dialog.values.name,
      topicIds: dialog.values.topicIds,
    };

    if (dialog.mode === 'create') {
      await apiService.createTrainingPreset(body);
      pushToast('Пресет создан.');
    } else if (dialog.presetId) {
      await apiService.updateTrainingPreset(dialog.presetId, body);
      pushToast('Пресет обновлён.');
    }

    resetDialog();
    await loadData();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось сохранить пресет.'),
      'error',
    );
  } finally {
    saving.value = false;
  }
}

function askDelete(preset: TrainingPreset) {
  deleteDialog.open = true;
  deleteDialog.presetId = preset.id;
  deleteDialog.name = preset.name;
}

async function confirmDelete() {
  if (!deleteDialog.presetId) {
    return;
  }

  deleting.value = true;

  try {
    await apiService.deleteTrainingPreset(deleteDialog.presetId);
    deleteDialog.open = false;
    deleteDialog.presetId = null;
    deleteDialog.name = '';
    pushToast('Пресет удалён.');
    await loadData();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось удалить пресет.'),
      'error',
    );
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <section class="page-frame">
    <section class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Пресеты</span>
        <strong>{{ presets.length }}</strong>
        <small>Небольшой каталог готовых наборов тем.</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Связей тем</span>
        <strong>{{ totalLinkedTopics }}</strong>
        <small>Суммарное количество связей с темами во всех пресетах.</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Покрытие</span>
        <strong>{{ uniqueTopicsCount }}</strong>
        <small>Уникальные темы, уже включённые в пресеты.</small>
      </article>
    </section>

    <UiPanel class="content-panel" variant="default">
      <div class="toolbar-panel__copy page-copy">
        Пресет хранит имя и упорядоченный список тем. Порядок определяет приоритет,
        если один вопрос подходит под несколько выбранных тем.
      </div>
    </UiPanel>

    <UiPanel class="toolbar-panel" variant="toolbar">
      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton :icon="mdiRefresh" tone="secondary" @click="loadData">
            Обновить
          </UiButton>

          <UiButton :icon="mdiPlus" @click="openCreateDialog">
            Новый пресет
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

    <UiPanel class="table-frame presets-list-panel" variant="table">
      <div class="table-frame__header">
        <span class="table-card__caption">Каталог пресетов</span>
        <span class="table-card__caption">{{ presets.length }} записей</span>
      </div>

      <div class="table-frame__surface">
        <div v-if="loading && !presets.length" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="presets.length" class="preset-admin-list">
          <div class="list-head list-head--presets">
            <span>Пресет</span>
            <span>Темы</span>
            <span>Обновлён</span>
            <span>Действия</span>
          </div>

          <article
            v-for="preset in presets"
            :key="preset.id"
            class="list-row preset-row"
          >
            <div class="question-cell">
              <strong>{{ preset.name }}</strong>
              <p>{{ preset.topics.length }} тем в зафиксированном порядке.</p>
            </div>

            <div class="list-cell">
              <div class="topic-stack">
                <v-chip
                  v-for="(topic, index) in preset.topics"
                  :key="topic.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ index + 1 }}. {{ topic.name }}
                </v-chip>
              </div>
            </div>

            <div class="list-cell date-cell">
              {{ formatDate(preset.updatedAt) }}
            </div>

            <div class="row-actions row-actions--compact">
              <UiIconButton
                :icon="mdiPencilOutline"
                label="Редактировать пресет"
                title="Редактировать пресет"
                @click="openEditDialog(preset)"
              />
              <UiIconButton
                :icon="mdiDeleteOutline"
                label="Удалить пресет"
                title="Удалить пресет"
                tone="danger"
                @click="askDelete(preset)"
              />
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Пресетов нет</p>
          <span>Создай первый набор тем для тренировок.</span>
        </div>
      </div>
    </UiPanel>

    <v-dialog v-model="dialog.open" max-width="760">
      <UiPanel class="training-preset-dialog form-panel" padding="default" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ dialogTitle }}</h2>
            <p class="page-copy">Сначала задай имя, потом собери и упорядочь список тем.</p>
          </div>
        </div>

        <UiField
          v-model="dialog.values.name"
          label="Название пресета"
          placeholder="Например, Angular Developer"
        />

        <div class="training-preset-builder">
          <UiAutocomplete
            v-model="dialog.topicPickerId"
            :items="topicOptions"
            clearable
            item-title="name"
            item-value="id"
            label="Добавить тему"
            no-data-text="Темы не найдены"
          />

          <UiButton
            :disabled="!dialog.topicPickerId"
            :icon="mdiPlus"
            tone="secondary"
            @click="addTopicToDialog"
          >
            Добавить
          </UiButton>
        </div>

        <div v-if="orderedDialogTopics.length" class="training-preset-order">
          <article
            v-for="(topic, index) in orderedDialogTopics"
            :key="topic.id"
            class="training-preset-order-item"
          >
            <span class="training-preset-order-item__index">{{ index + 1 }}</span>

            <div class="training-preset-order-item__topic">
              <strong>{{ topic.name }}</strong>
              <small>{{ topic.slug }}</small>
            </div>

            <div class="training-preset-order-item__actions">
              <UiIconButton
                :disabled="index === 0"
                :icon="mdiArrowUp"
                label="Поднять тему вверх"
                title="Поднять тему вверх"
                @click="moveTopic(topic.id, -1)"
              />

              <UiIconButton
                :disabled="index === orderedDialogTopics.length - 1"
                :icon="mdiArrowDown"
                label="Опустить тему вниз"
                title="Опустить тему вниз"
                @click="moveTopic(topic.id, 1)"
              />

              <UiIconButton
                :icon="mdiTrayRemove"
                label="Убрать тему из пресета"
                title="Убрать тему из пресета"
                tone="danger"
                @click="removeTopicFromDialog(topic.id)"
              />
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Темы не выбраны</p>
          <span>Собери упорядоченный список тем для этого пресета.</span>
        </div>

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="secondary" @click="resetDialog">
              Отмена
            </UiButton>
            <UiButton
              :disabled="!dialog.values.name.trim() || dialog.values.topicIds.length === 0"
              :loading="saving"
              @click="savePreset"
            >
              Сохранить
            </UiButton>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-dialog v-model="deleteDialog.open" max-width="520">
      <UiPanel class="confirm-card training-exit-dialog detail-panel" padding="default" variant="detail">
        <h2>Удалить пресет</h2>
        <p class="confirm-text">
          Пресет <strong>{{ deleteDialog.name }}</strong> будет удалён без архивации.
        </p>
        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="secondary" @click="deleteDialog.open = false">
              Отмена
            </UiButton>
            <UiButton :loading="deleting" tone="danger" @click="confirmDelete">
              Удалить
            </UiButton>
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
