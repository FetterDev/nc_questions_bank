<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
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

const session = useSession();
const loading = ref(false);
const errorMessage = ref('');
const myMatrix = ref<CompetencyMatrix | null>(null);
const managerItems = ref<CompetencyMatrix[]>([]);
const stackOptions = ref<Stack[]>([]);
const competencyOptions = ref<Competency[]>([]);
const stackId = ref('all');
const newStackName = ref('');
const newCompetencyStackId = ref('');
const newCompetencyName = ref('');
const newCompetencyDescription = ref('');
const directorySaving = ref(false);

const stackSelectOptions = computed(() => [
  { id: 'all', name: 'Все стеки' },
  ...stackOptions.value.map((item) => ({
    id: item.id,
    name: item.name,
  })),
]);

const matrixItems = computed(() =>
  session.isManager.value ? managerItems.value : myMatrix.value ? [myMatrix.value] : [],
);
const visibleCompetencies = computed(() =>
  competencyOptions.value.filter(
    (item) => stackId.value === 'all' || item.stackId === stackId.value,
  ),
);

async function loadStacks() {
  if (!session.isManager.value) {
    return;
  }

  try {
    stackOptions.value = await apiService.listAllStacks();

    if (!newCompetencyStackId.value && stackOptions.value.length > 0) {
      newCompetencyStackId.value = stackOptions.value[0].id;
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
        stackId: stackId.value === 'all' ? undefined : stackId.value,
      });
      managerItems.value = response.items;
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

async function createStack() {
  const name = newStackName.value.trim();

  if (!name) {
    return;
  }

  directorySaving.value = true;
  errorMessage.value = '';

  try {
    const created = await apiService.createStack({ name });
    newStackName.value = '';
    newCompetencyStackId.value = created.id;
    await loadStacks();
    await loadCompetencies();
    await loadMatrix();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось создать стек.');
  } finally {
    directorySaving.value = false;
  }
}

async function createCompetency() {
  const name = newCompetencyName.value.trim();

  if (!name || !newCompetencyStackId.value) {
    return;
  }

  directorySaving.value = true;
  errorMessage.value = '';

  try {
    const sameStackCompetencies = competencyOptions.value.filter(
      (item) => item.stackId === newCompetencyStackId.value,
    );
    await apiService.createCompetency({
      stackId: newCompetencyStackId.value,
      name,
      description: newCompetencyDescription.value.trim() || null,
      position: sameStackCompetencies.length + 1,
    });
    newCompetencyName.value = '';
    newCompetencyDescription.value = '';
    await loadCompetencies();
    await loadMatrix();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось создать компетенцию.',
    );
  } finally {
    directorySaving.value = false;
  }
}

function competencyMeta(item: CompetencyMatrix['competencies'][number]) {
  if (!item.totalCount) {
    return 'нет оценок';
  }

  return `${item.accuracy}% · ${item.correctCount} / ${item.partialCount} / ${item.incorrectCount}`;
}

watch(
  () => stackId.value,
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
    <UiPanel
      v-if="session.isManager.value"
      class="toolbar-panel"
      variant="toolbar"
    >
      <div class="toolbar-panel__filters competency-matrix-toolbar">
        <UiSelect
          v-model="stackId"
          :items="stackSelectOptions"
          item-title="name"
          item-value="id"
          label="Стек"
        />
      </div>
    </UiPanel>

    <UiPanel
      v-if="session.isManager.value"
      class="detail-panel competency-directory"
      variant="detail"
    >
      <div class="panel-header">
        <div class="panel-copy">
          <h2>Справочник стеков</h2>
        </div>
      </div>

      <div class="competency-directory__forms">
        <div class="competency-directory__form">
          <UiField
            v-model="newStackName"
            label="Новый стек"
            placeholder="Frontend"
          />
          <UiButton :loading="directorySaving" @click="createStack">
            Создать стек
          </UiButton>
        </div>

        <div class="competency-directory__form competency-directory__form--wide">
          <UiSelect
            v-model="newCompetencyStackId"
            :items="stackOptions"
            item-title="name"
            item-value="id"
            label="Стек"
          />
          <UiField
            v-model="newCompetencyName"
            label="Компетенция"
            placeholder="TypeScript"
          />
          <UiField
            v-model="newCompetencyDescription"
            label="Описание"
            placeholder="Краткое описание"
          />
          <UiButton :loading="directorySaving" @click="createCompetency">
            Создать компетенцию
          </UiButton>
        </div>
      </div>

      <div v-if="visibleCompetencies.length" class="topic-stack">
        <v-chip
          v-for="competency in visibleCompetencies"
          :key="competency.id"
          color="secondary"
          size="small"
          variant="tonal"
        >
          {{ competency.stack.name }} · {{ competency.name }}
        </v-chip>
      </div>
    </UiPanel>

    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading" class="empty-state empty-state-panel" variant="empty">
      <p>Загрузка</p>
    </UiPanel>

    <div v-else-if="matrixItems.length" class="competency-matrix-list">
      <UiPanel
        v-for="matrix in matrixItems"
        :key="matrix.user.id"
        class="detail-panel competency-matrix-card"
        variant="detail"
      >
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ matrix.user.displayName }}</h2>
            <small>{{ matrix.user.login }}</small>
          </div>

          <div class="topic-stack">
            <v-chip
              v-for="stack in matrix.stacks"
              :key="stack.id"
              color="secondary"
              size="small"
              variant="tonal"
            >
              {{ stack.name }}
            </v-chip>
          </div>
        </div>

        <div v-if="matrix.competencies.length" class="competency-matrix-grid">
          <article
            v-for="competency in matrix.competencies"
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
  </section>
</template>
