<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  mdiDeleteOutline,
  mdiDrag,
  mdiMagnify,
  mdiPencilOutline,
  mdiPlus,
  mdiRefresh,
} from '@mdi/js';
import UiAutocomplete from '../components/ui/UiAutocomplete.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import { useSession } from '../composables/useSession';
import type {
  CompetencyMatrix,
  Competency,
  Stack,
} from '../features/competencies/competencies.types';
import { toUserErrorMessage } from '../features/system/error.utils';
import {
  formatTrainingResult,
  trainingResultColor,
} from '../features/training/training.utils';
import { apiService } from '../services/api.service';

type ManagerTab = 'directory' | 'assignments';
type DialogMode = 'create' | 'edit';
type ConfirmTarget =
  | { kind: 'stack'; id: string; name: string }
  | { kind: 'competency'; id: string; name: string; stackName: string };

const session = useSession();
const loading = ref(false);
const errorMessage = ref('');
const myMatrix = ref<CompetencyMatrix | null>(null);
const managerItems = ref<CompetencyMatrix[]>([]);
const stackOptions = ref<Stack[]>([]);
const competencyOptions = ref<Competency[]>([]);
const managerTab = ref<ManagerTab>('directory');
const stackSearchQuery = ref('');
const assignmentSearchQuery = ref('');
const assignmentStackId = ref('all');
const selectedStackId = ref('');
const directorySaving = ref(false);
const assignmentSavingUserId = ref('');
const draggingCompetencyId = ref('');

const stackDialog = reactive({
  open: false,
  mode: 'create' as DialogMode,
  id: '',
  name: '',
});

const competencyDialog = reactive({
  open: false,
  mode: 'create' as DialogMode,
  id: '',
  stackId: '',
  name: '',
  description: '',
  position: '',
});

const confirmDialog = reactive({
  open: false,
  target: null as ConfirmTarget | null,
});

const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});

const stackAssignments = ref<Record<string, string[]>>({});

const assignmentStackSelectOptions = computed(() => [
  { id: 'all', name: 'Все стеки' },
  ...stackOptions.value.map((item) => ({
    id: item.id,
    name: item.name,
  })),
]);

const visibleStacks = computed(() => {
  const query = stackSearchQuery.value.trim().toLocaleLowerCase('ru-RU');

  if (!query) {
    return stackOptions.value;
  }

  return stackOptions.value.filter((stack) =>
    `${stack.name} ${stack.slug}`.toLocaleLowerCase('ru-RU').includes(query),
  );
});

const selectedStack = computed(() =>
  stackOptions.value.find((item) => item.id === selectedStackId.value) ?? null,
);

const selectedStackCompetencies = computed(() =>
  competencyOptions.value.filter((item) => item.stackId === selectedStackId.value),
);

const assignmentItems = computed(() => {
  const query = assignmentSearchQuery.value.trim().toLocaleLowerCase('ru-RU');

  if (!query) {
    return managerItems.value;
  }

  return managerItems.value.filter((item) =>
    `${item.user.displayName} ${item.user.login}`.toLocaleLowerCase('ru-RU').includes(query),
  );
});

const stackDialogTitle = computed(() =>
  stackDialog.mode === 'create' ? 'Новый стек' : 'Редактирование стека',
);

const competencyDialogTitle = computed(() =>
  competencyDialog.mode === 'create'
    ? 'Новая компетенция'
    : 'Редактирование компетенции',
);

const confirmTitle = computed(() => {
  if (!confirmDialog.target) {
    return '';
  }

  return confirmDialog.target.kind === 'stack'
    ? 'Удалить стек?'
    : 'Удалить компетенцию?';
});

const confirmText = computed(() => {
  const target = confirmDialog.target;

  if (!target) {
    return '';
  }

  if (target.kind === 'stack') {
    return `${target.name} будет удалён вместе с компетенциями и назначениями пользователям. История завершённых интервью сохранится.`;
  }

  return `${target.name} будет удалена из стека ${target.stackName}. Связи с вопросами будут удалены, история завершённых интервью сохранится.`;
});

async function loadStacks() {
  if (!session.isManager.value) {
    return;
  }

  try {
    stackOptions.value = await apiService.listAllStacks();

    if (
      !selectedStackId.value ||
      !stackOptions.value.some((item) => item.id === selectedStackId.value)
    ) {
      selectedStackId.value = stackOptions.value[0]?.id ?? '';
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось загрузить стеки.');
  }
}

async function loadCompetencies() {
  if (!session.isManager.value) {
    return;
  }

  try {
    competencyOptions.value = await apiService.listAllCompetencies();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить компетенции.',
    );
  }
}

async function loadMatrix() {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (session.isManager.value) {
      const response = await apiService.listCompetencyMatrix({
        stackId: assignmentStackId.value === 'all' ? undefined : assignmentStackId.value,
      });
      managerItems.value = response.items;
      stackAssignments.value = Object.fromEntries(
        response.items.map((item) => [
          item.user.id,
          item.stacks.map((stack) => stack.id),
        ]),
      );
      return;
    }

    myMatrix.value = await apiService.getMyCompetencyMatrix();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить матрицу компетенций.',
    );
  } finally {
    loading.value = false;
  }
}

async function refreshDirectory() {
  await loadStacks();
  await loadCompetencies();
}

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

function openCreateStackDialog() {
  stackDialog.open = true;
  stackDialog.mode = 'create';
  stackDialog.id = '';
  stackDialog.name = '';
}

function openEditStackDialog(stack: Stack) {
  stackDialog.open = true;
  stackDialog.mode = 'edit';
  stackDialog.id = stack.id;
  stackDialog.name = stack.name;
}

async function saveStack() {
  const name = stackDialog.name.trim();

  if (!name) {
    return;
  }

  directorySaving.value = true;
  errorMessage.value = '';

  try {
    if (stackDialog.mode === 'create') {
      const created = await apiService.createStack({ name });
      selectedStackId.value = created.id;
      pushToast('Стек создан.');
    } else {
      await apiService.updateStack(stackDialog.id, { name });
      pushToast('Стек обновлён.');
    }

    stackDialog.open = false;
    await refreshDirectory();
    await loadMatrix();
  } catch (error) {
    pushToast(toUserErrorMessage(error, 'Не удалось сохранить стек.'), 'error');
  } finally {
    directorySaving.value = false;
  }
}

function openCreateCompetencyDialog() {
  if (!selectedStack.value) {
    return;
  }

  competencyDialog.open = true;
  competencyDialog.mode = 'create';
  competencyDialog.id = '';
  competencyDialog.stackId = selectedStack.value.id;
  competencyDialog.name = '';
  competencyDialog.description = '';
  competencyDialog.position = String(selectedStackCompetencies.value.length + 1);
}

function openEditCompetencyDialog(competency: Competency) {
  competencyDialog.open = true;
  competencyDialog.mode = 'edit';
  competencyDialog.id = competency.id;
  competencyDialog.stackId = competency.stackId;
  competencyDialog.name = competency.name;
  competencyDialog.description = competency.description ?? '';
  competencyDialog.position = String(competency.position);
}

async function saveCompetency() {
  const name = competencyDialog.name.trim();
  const stackId = competencyDialog.stackId;
  const position = Number(competencyDialog.position);

  if (!name || !stackId || !Number.isInteger(position) || position < 1) {
    return;
  }

  directorySaving.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      stackId,
      name,
      description: competencyDialog.description.trim() || null,
      position,
    };

    if (competencyDialog.mode === 'create') {
      await apiService.createCompetency(payload);
      pushToast('Компетенция создана.');
    } else {
      await apiService.updateCompetency(competencyDialog.id, payload);
      pushToast('Компетенция обновлена.');
    }

    selectedStackId.value = stackId;
    competencyDialog.open = false;
    await refreshDirectory();
    await loadMatrix();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось сохранить компетенцию.'),
      'error',
    );
  } finally {
    directorySaving.value = false;
  }
}

function openDeleteStackDialog(stack: Stack) {
  confirmDialog.open = true;
  confirmDialog.target = {
    kind: 'stack',
    id: stack.id,
    name: stack.name,
  };
}

function openDeleteCompetencyDialog(competency: Competency) {
  confirmDialog.open = true;
  confirmDialog.target = {
    kind: 'competency',
    id: competency.id,
    name: competency.name,
    stackName: competency.stack.name,
  };
}

async function confirmDelete() {
  const target = confirmDialog.target;

  if (!target) {
    return;
  }

  directorySaving.value = true;
  errorMessage.value = '';

  try {
    if (target.kind === 'stack') {
      await apiService.deleteStack(target.id);
      if (selectedStackId.value === target.id) {
        selectedStackId.value = '';
      }
      pushToast('Стек удалён.');
    } else {
      await apiService.deleteCompetency(target.id);
      pushToast('Компетенция удалена.');
    }

    confirmDialog.open = false;
    confirmDialog.target = null;
    await refreshDirectory();
    await loadMatrix();
  } catch (error) {
    pushToast(toUserErrorMessage(error, 'Не удалось удалить.'), 'error');
  } finally {
    directorySaving.value = false;
  }
}

async function saveUserStacks(userId: string) {
  assignmentSavingUserId.value = userId;
  errorMessage.value = '';

  try {
    await apiService.updateUserStacks(userId, {
      stackIds: stackAssignments.value[userId] ?? [],
    });
    await loadMatrix();
    pushToast('Назначения сохранены.');
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось назначить стеки сотруднику.',
    );
  } finally {
    assignmentSavingUserId.value = '';
  }
}

function competencyMeta(item: CompetencyMatrix['competencies'][number]) {
  if (!item.totalCount) {
    return 'нет оценок';
  }

  return `${item.accuracy}% · ${item.correctCount} / ${item.partialCount} / ${item.incorrectCount}`;
}

function handleDragStart(competencyId: string) {
  draggingCompetencyId.value = competencyId;
}

async function handleCompetencyDrop(targetIndex: number) {
  const draggedId = draggingCompetencyId.value;
  draggingCompetencyId.value = '';

  if (!draggedId) {
    return;
  }

  const draggedIndex = selectedStackCompetencies.value.findIndex(
    (item) => item.id === draggedId,
  );

  if (draggedIndex === -1 || draggedIndex === targetIndex) {
    return;
  }

  try {
    await apiService.updateCompetency(draggedId, {
      position: targetIndex + 1,
    });
    await loadCompetencies();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось изменить порядок компетенций.'),
      'error',
    );
  }
}

async function handlePositionInput(competency: Competency, event: Event) {
  const input = event.target as HTMLInputElement;
  const position = Number(input.value);

  if (!Number.isInteger(position) || position < 1 || position === competency.position) {
    input.value = String(competency.position);
    return;
  }

  try {
    await apiService.updateCompetency(competency.id, {
      position,
    });
    await loadCompetencies();
  } catch (error) {
    input.value = String(competency.position);
    pushToast(
      toUserErrorMessage(error, 'Не удалось изменить позицию компетенции.'),
      'error',
    );
  }
}

watch(
  () => assignmentStackId.value,
  () => {
    if (session.isManager.value) {
      void loadMatrix();
    }
  },
);

onMounted(async () => {
  await session.loadSession();
  await loadStacks();
  await loadCompetencies();
  await loadMatrix();
});
</script>

<template>
  <section class="page-frame">
    <template v-if="session.isManager.value">
      <header class="competency-page-head">
        <h1>Матрица компетенций</h1>
        <p>Справочник стеков и назначения сотрудникам</p>
      </header>

      <div class="competency-workspace-tabs">
        <div class="line-tabs" role="tablist" aria-label="Раздел матрицы компетенций">
          <button
            class="line-tabs__item"
            :class="{ 'line-tabs__item--active': managerTab === 'directory' }"
            type="button"
            @click="managerTab = 'directory'"
          >
            Справочник
          </button>
          <button
            class="line-tabs__item"
            :class="{ 'line-tabs__item--active': managerTab === 'assignments' }"
            type="button"
            @click="managerTab = 'assignments'"
          >
            Назначения
          </button>
        </div>
      </div>

      <v-alert v-if="errorMessage" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <section v-if="managerTab === 'directory'" class="competency-directory-workspace">
        <UiPanel class="competency-stacks-sidebar" variant="detail">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>Стеки</h2>
            </div>
          </div>

          <div class="competency-stack-controls">
            <UiField
              v-model="stackSearchQuery"
              clearable
              hide-label
              label="Поиск стека"
              placeholder="Поиск стека"
            >
              <template #prepend-inner>
                <v-icon :icon="mdiMagnify" size="20" />
              </template>
            </UiField>

            <UiButton :icon="mdiPlus" @click="openCreateStackDialog">
              Стек
            </UiButton>
          </div>

          <div v-if="visibleStacks.length" class="competency-stack-list">
            <article
              v-for="stack in visibleStacks"
              :key="stack.id"
              class="competency-stack-item"
              :class="{ 'competency-stack-item--active': stack.id === selectedStackId }"
              role="button"
              tabindex="0"
              @click="selectedStackId = stack.id"
              @keydown.enter="selectedStackId = stack.id"
            >
              <div class="competency-stack-item__copy">
                <strong>{{ stack.name }}</strong>
                <small>{{ stack.competenciesCount }} компетенций · {{ stack.slug }}</small>
              </div>

              <div class="row-actions row-actions--compact">
                <UiIconButton
                  :icon="mdiPencilOutline"
                  label="Переименовать стек"
                  title="Переименовать стек"
                  @click.stop="openEditStackDialog(stack)"
                />
                <UiIconButton
                  :icon="mdiDeleteOutline"
                  label="Удалить стек"
                  title="Удалить стек"
                  tone="danger"
                  @click.stop="openDeleteStackDialog(stack)"
                />
              </div>
            </article>
          </div>

          <div v-else class="empty-state empty-state-panel">
            <p>Стеки не найдены</p>
          </div>
        </UiPanel>

        <UiPanel class="competency-stack-detail" variant="detail">
          <template v-if="selectedStack">
            <div class="panel-header">
              <div class="panel-copy">
                <h2>{{ selectedStack.name }}</h2>
                <span class="competency-slug-badge">{{ selectedStack.slug }}</span>
              </div>

              <div class="action-footer__group">
                <UiButton
                  :icon="mdiPencilOutline"
                  tone="secondary"
                  @click="openEditStackDialog(selectedStack)"
                >
                  Переименовать
                </UiButton>
                <UiButton
                  :icon="mdiDeleteOutline"
                  tone="danger"
                  @click="openDeleteStackDialog(selectedStack)"
                >
                  Удалить
                </UiButton>
                <UiButton :icon="mdiPlus" @click="openCreateCompetencyDialog">
                  Компетенция
                </UiButton>
              </div>
            </div>

            <div class="competency-table-header">
              <div>
                <strong>Компетенции стека</strong>
                <small>Порядок меняется drag/drop или через поле позиции</small>
              </div>
              <UiButton :icon="mdiRefresh" tone="secondary" @click="refreshDirectory">
                Обновить
              </UiButton>
            </div>

            <div v-if="selectedStackCompetencies.length" class="competency-table">
              <div class="competency-table__head">
                <span />
                <span>Позиция</span>
                <span>Компетенция</span>
                <span>Описание</span>
                <span>Действия</span>
              </div>

              <article
                v-for="(competency, index) in selectedStackCompetencies"
                :key="competency.id"
                class="competency-table__row"
                draggable="true"
                @dragstart="handleDragStart(competency.id)"
                @dragend="draggingCompetencyId = ''"
                @dragover.prevent
                @drop="handleCompetencyDrop(index)"
              >
                <v-icon
                  class="competency-table__drag"
                  :icon="mdiDrag"
                  size="20"
                />
                <input
                  class="competency-position-input"
                  :value="competency.position"
                  type="number"
                  min="1"
                  aria-label="Позиция компетенции"
                  @change="handlePositionInput(competency, $event)"
                  @click.stop
                >
                <strong>{{ competency.name }}</strong>
                <span class="competency-table__description">
                  {{ competency.description || 'Без описания' }}
                </span>
                <div class="row-actions row-actions--compact">
                  <UiIconButton
                    :icon="mdiPencilOutline"
                    label="Редактировать компетенцию"
                    title="Редактировать компетенцию"
                    @click="openEditCompetencyDialog(competency)"
                  />
                  <UiIconButton
                    :icon="mdiDeleteOutline"
                    label="Удалить компетенцию"
                    title="Удалить компетенцию"
                    tone="danger"
                    @click="openDeleteCompetencyDialog(competency)"
                  />
                </div>
              </article>
            </div>
            <p v-if="selectedStackCompetencies.length" class="competency-stack-total">
              Всего компетенций: {{ selectedStack.competenciesCount }}
            </p>

            <div v-else class="empty-state empty-state-panel">
              <p>Компетенций пока нет</p>
              <span>Создай первую компетенцию для выбранного стека.</span>
            </div>
          </template>

          <div v-else class="empty-state empty-state-panel">
            <p>Выбери или создай стек</p>
          </div>
        </UiPanel>
      </section>

      <section v-else class="competency-assignments-workspace">
        <UiPanel class="toolbar-panel" variant="toolbar">
          <div class="toolbar-panel__filters competency-assignment-filters">
            <UiField
              v-model="assignmentSearchQuery"
              clearable
              label="Поиск user"
              placeholder="Имя или login"
            />
            <UiSelect
              v-model="assignmentStackId"
              :items="assignmentStackSelectOptions"
              item-title="name"
              item-value="id"
              label="Стек"
            />
          </div>
        </UiPanel>

        <UiPanel class="table-frame competency-assignments-table" variant="table">
          <div class="table-frame__surface">
            <div v-if="loading && !assignmentItems.length" class="empty-state empty-state-panel">
              <p>Загрузка</p>
            </div>

            <div v-else-if="assignmentItems.length" class="competency-assignment-list">
              <div class="list-head list-head--competency-assignments">
                <span>Сотрудник</span>
                <span>Назначенные стеки</span>
                <span>Действия</span>
              </div>

              <article
                v-for="matrix in assignmentItems"
                :key="matrix.user.id"
                class="list-row competency-assignment-table-row"
              >
                <div class="topic-name-cell">
                  <strong>{{ matrix.user.displayName }}</strong>
                  <p>{{ matrix.user.login }}</p>
                </div>

                <UiAutocomplete
                  v-model="stackAssignments[matrix.user.id]"
                  :items="stackOptions"
                  chips
                  clearable
                  closable-chips
                  hide-label
                  item-title="name"
                  item-value="id"
                  label="Стеки сотрудника"
                  multiple
                  placeholder="Назначьте стеки"
                />

                <div class="row-actions row-actions--compact">
                  <UiButton
                    :loading="assignmentSavingUserId === matrix.user.id"
                    tone="secondary"
                    @click="saveUserStacks(matrix.user.id)"
                  >
                    Сохранить
                  </UiButton>
                </div>
              </article>
            </div>

            <div v-else class="empty-state empty-state-panel">
              <p>Сотрудники не найдены</p>
            </div>
          </div>
        </UiPanel>
      </section>

      <v-dialog v-model="stackDialog.open" max-width="520">
        <UiPanel class="form-panel" padding="default" variant="form">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ stackDialogTitle }}</h2>
            </div>
          </div>

          <div class="editor-form">
            <UiField
              v-model="stackDialog.name"
              required
              label="Название стека"
              placeholder="Frontend"
            />

            <div class="action-footer action-footer--end">
              <div class="action-footer__group">
                <UiButton tone="secondary" @click="stackDialog.open = false">
                  Отмена
                </UiButton>
                <UiButton :loading="directorySaving" @click="saveStack">
                  Сохранить
                </UiButton>
              </div>
            </div>
          </div>
        </UiPanel>
      </v-dialog>

      <v-dialog v-model="competencyDialog.open" max-width="620">
        <UiPanel class="form-panel" padding="default" variant="form">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ competencyDialogTitle }}</h2>
              <small>Создание и редактирование используют один диалог.</small>
            </div>
          </div>

          <div class="editor-form">
            <UiSelect
              v-model="competencyDialog.stackId"
              :items="stackOptions"
              item-title="name"
              item-value="id"
              label="Стек"
              required
            />
            <UiField
              v-model="competencyDialog.name"
              required
              label="Название"
              placeholder="TypeScript"
            />
            <UiField
              v-model="competencyDialog.description"
              label="Описание"
              placeholder="Краткое описание компетенции"
              textarea
            />
            <UiField
              v-model="competencyDialog.position"
              label="Позиция"
              min="1"
              required
              type="number"
            />

            <div class="action-footer action-footer--end">
              <div class="action-footer__group">
                <UiButton tone="secondary" @click="competencyDialog.open = false">
                  Отмена
                </UiButton>
                <UiButton :loading="directorySaving" @click="saveCompetency">
                  Сохранить
                </UiButton>
              </div>
            </div>
          </div>
        </UiPanel>
      </v-dialog>

      <v-dialog v-model="confirmDialog.open" max-width="560">
        <UiPanel class="form-panel" padding="default" variant="form">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ confirmTitle }}</h2>
              <small>Действие необратимо.</small>
            </div>
          </div>

          <p class="delete-confirm-copy">{{ confirmText }}</p>

          <div class="action-footer action-footer--end">
            <div class="action-footer__group">
              <UiButton tone="secondary" @click="confirmDialog.open = false">
                Отмена
              </UiButton>
              <UiButton
                :loading="directorySaving"
                tone="danger"
                @click="confirmDelete"
              >
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
    </template>

    <template v-else>
      <v-alert v-if="errorMessage" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <UiPanel v-if="loading" class="empty-state empty-state-panel" variant="empty">
        <p>Загрузка</p>
      </UiPanel>

      <div v-else-if="myMatrix" class="competency-matrix-list">
        <UiPanel class="detail-panel competency-matrix-card" variant="detail">
          <div class="panel-header">
            <div class="panel-copy">
              <h2>{{ myMatrix.user.displayName }}</h2>
              <small>{{ myMatrix.user.login }}</small>
            </div>

            <div class="topic-stack">
              <v-chip
                v-for="stack in myMatrix.stacks"
                :key="stack.id"
                color="secondary"
                size="small"
                variant="tonal"
              >
                {{ stack.name }}
              </v-chip>
            </div>
          </div>

          <div v-if="myMatrix.competencies.length" class="competency-matrix-grid">
            <article
              v-for="competency in myMatrix.competencies"
              :key="competency.id"
              class="competency-matrix-row"
            >
              <div class="competency-matrix-row__copy">
                <strong>{{ competency.name }}</strong>
                <small>{{ competency.stack.name }} · {{ competencyMeta(competency) }}</small>
              </div>

              <v-progress-linear
                :model-value="competency.accuracy"
                color="success"
                height="8"
                rounded
              />

              <v-chip
                v-if="competency.lastResult"
                :color="trainingResultColor(competency.lastResult)"
                size="small"
                variant="tonal"
              >
                {{ formatTrainingResult(competency.lastResult) }}
              </v-chip>
              <span v-else class="muted-inline">Нет оценки</span>
            </article>
          </div>

          <div v-else class="empty-state empty-state-panel">
            <p>Компетенции не назначены</p>
          </div>
        </UiPanel>
      </div>

      <UiPanel v-else class="empty-state empty-state-panel" variant="empty">
        <p>Матрица пуста</p>
      </UiPanel>
    </template>
  </section>
</template>
