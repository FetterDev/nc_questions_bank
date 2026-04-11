<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiCardsOutline,
  mdiCheck,
  mdiClose,
  mdiExitRun,
  mdiMinus,
  mdiPlus,
  mdiPlayOutline,
  mdiSkipNext,
} from '@mdi/js';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import type { Topic } from '../features/topics/topics.types';
import type {
  TrainingCardState,
  TrainingResultValue,
  TrainingParticipant,
  TrainingPreset,
  TrainingQuestionItem,
  TrainingResultStatus,
  TrainingTopicBreakdown,
} from '../features/training/training.types';
import {
  formatTrainingResult,
  isTrainingResultValue,
  trainingResultColor,
} from '../features/training/training.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

type TrainingSessionCard = TrainingQuestionItem & {
  state: TrainingCardState;
};

type TrainingMode = 'self' | 'other-user';

type TrainingModeOption = {
  description: string;
  disabled: boolean;
  title: string;
  value: TrainingMode;
};

type TrainingAssigneeOption = Pick<TrainingParticipant, 'id' | 'displayName'> & {
  title: string;
};

const presets = ref<TrainingPreset[]>([]);
const topicOptions = ref<Topic[]>([]);
const traineeOptions = ref<TrainingAssigneeOption[]>([]);
const loading = ref(false);
const preparing = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const trainingMode = ref<TrainingMode>('self');
const activeTrainingMode = ref<TrainingMode>('self');
const selectedPresetId = ref<string | null>(null);
const selectedTopicIds = ref<string[]>([]);
const selectedTraineeId = ref<string | null>(null);
const activeTrainee = ref<TrainingAssigneeOption | null>(null);
const sessionFeedback = ref('');
const sessionCards = ref<TrainingSessionCard[]>([]);
const sessionBreakdown = ref<TrainingTopicBreakdown[]>([]);
const activeIndex = ref(0);
const exitDialogOpen = ref(false);
const answerAnchor = ref<HTMLElement | null>(null);
const snackbar = ref({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});

const modeOptions = computed<TrainingModeOption[]>(() => [
  {
    title: 'Тренировать себя',
    value: 'self',
    description: 'Стандартный режим с самостоятельной проверкой ответа.',
    disabled: false,
  },
  {
    title: 'Тренировать другого пользователя',
    value: 'other-user',
    description:
      'Ответ открыт сразу, можно оценить пользователя и сохранить фидбек в его карточку роста.',
    disabled: false,
  },
]);
const selectedPreset = computed(
  () => presets.value.find((preset) => preset.id === selectedPresetId.value) ?? null,
);
const isTrainingActive = computed(() => sessionCards.value.length > 0);
const topicsById = computed(
  () => new Map(topicOptions.value.map((topic) => [topic.id, topic])),
);
const traineesById = computed(
  () => new Map(traineeOptions.value.map((user) => [user.id, user])),
);
const selectedTopicSet = computed(() => new Set(selectedTopicIds.value));
const selectedTopics = computed(() =>
  selectedTopicIds.value
    .map((topicId) => topicsById.value.get(topicId))
    .filter((topic): topic is Topic => Boolean(topic)),
);
const selectedTrainee = computed(
  () => traineesById.value.get(selectedTraineeId.value ?? '') ?? null,
);
const availableTopics = computed(() =>
  topicOptions.value.filter((topic) => !selectedTopicSet.value.has(topic.id)),
);
const selectedTopicsCount = computed(() => selectedTopicIds.value.length);
const isOtherUserMode = computed(() => trainingMode.value === 'other-user');
const isActiveOtherUserMode = computed(() => activeTrainingMode.value === 'other-user');
const currentCard = computed(() => sessionCards.value[activeIndex.value] ?? null);
const answeredCount = computed(
  () => sessionCards.value.filter((item) => isTrainingResultValue(item.state)).length,
);
const pendingCount = computed(() => sessionCards.value.length - answeredCount.value);
const currentState = computed<TrainingCardState>(() => currentCard.value?.state ?? 'pending');
const isCurrentAnswerVisible = computed(
  () => currentState.value !== 'pending',
);
const canPrepare = computed(
  () =>
    selectedTopicIds.value.length > 0 &&
    (!isOtherUserMode.value || Boolean(selectedTrainee.value)),
);
const canFinish = computed(
  () => sessionCards.value.length > 0 && answeredCount.value === sessionCards.value.length,
);
const progressPercent = computed(() => {
  if (!sessionCards.value.length) {
    return 0;
  }

  return Math.round((answeredCount.value / sessionCards.value.length) * 100);
});
const currentModeDescription = computed(
  () => modeOptions.value.find((item) => item.value === trainingMode.value)?.description ?? '',
);
const activeSessionTitle = computed(() =>
  activeTrainee.value
    ? `Тренировка для ${activeTrainee.value.displayName}`
    : 'Тренировка',
);
const activeSessionMeta = computed(() => {
  return `${answeredCount.value} зафиксировано · ${pendingCount.value} осталось`;
});
const sessionFooterLabel = computed(() =>
  isActiveOtherUserMode.value
    ? 'Ответ открыт с первого шага. Оценки и фидбек сохраняются в карточку роста выбранного пользователя.'
    : 'Навигация не меняет уже зафиксированные результаты.',
);
const exitDialogDescription = computed(() =>
  isActiveOtherUserMode.value
    ? 'Сохраняются уже выставленные оценки и введённый фидбек для выбранного пользователя. Незаполненные карточки будут отброшены.'
    : 'Сохраняются только уже зафиксированные результаты. Незаполненные карточки будут отброшены.',
);
const currentStatusLabel = computed(() => {
  if (isTrainingResultValue(currentState.value)) {
    return formatTrainingResult(currentState.value);
  }

  if (currentState.value === 'revealed') {
    return 'ответ открыт';
  }

  return 'ожидает';
});
const currentStatusColor = computed(() => {
  if (isTrainingResultValue(currentState.value)) {
    return trainingResultColor(currentState.value);
  }

  return 'secondary';
});

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = {
    open: true,
    text,
    color,
  };
}

function resetSession() {
  sessionCards.value = [];
  sessionBreakdown.value = [];
  activeIndex.value = 0;
  exitDialogOpen.value = false;
  activeTrainingMode.value = 'self';
  activeTrainee.value = null;
  sessionFeedback.value = '';
}

function selectTrainingMode(mode: TrainingMode) {
  const option = modeOptions.value.find((item) => item.value === mode);

  if (!option || option.disabled) {
    return;
  }

  trainingMode.value = mode;
}

function mergeTopicIds(currentIds: string[], incomingIds: string[]) {
  const nextIds = [...currentIds];
  const seenIds = new Set(currentIds);

  for (const topicId of incomingIds) {
    if (!seenIds.has(topicId)) {
      seenIds.add(topicId);
      nextIds.push(topicId);
    }
  }

  return nextIds;
}

function addTopicToSelection(topicId: string) {
  selectedTopicIds.value = mergeTopicIds(selectedTopicIds.value, [topicId]);
}

function removeTopicFromSelection(topicId: string) {
  selectedTopicIds.value = selectedTopicIds.value.filter((id) => id !== topicId);
}

function formatTopicMeta(topic: Topic) {
  const questionsCount = topic.questionsCount ?? 0;
  const suffix =
    questionsCount === 1
      ? 'вопрос'
      : questionsCount >= 2 && questionsCount <= 4
        ? 'вопроса'
        : 'вопросов';

  return `${questionsCount} ${suffix} в банке`;
}

function startSession(items: TrainingQuestionItem[], breakdown: TrainingTopicBreakdown[]) {
  const initialState: TrainingCardState = isOtherUserMode.value ? 'revealed' : 'pending';

  sessionCards.value = items.map((item) => ({
    ...item,
    state: initialState,
  }));
  sessionBreakdown.value = breakdown;
  activeIndex.value = 0;
  activeTrainingMode.value = trainingMode.value;
  activeTrainee.value = isOtherUserMode.value ? selectedTrainee.value : null;
  sessionFeedback.value = '';
}

async function loadInitialData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const [fetchedPresets, fetchedTopics, fetchedParticipants] = await Promise.all([
      apiService.listTrainingPresets(),
      apiService.listAllTopics({ usedOnly: true }),
      apiService.listTrainingParticipants(),
    ]);

    presets.value = fetchedPresets;
    topicOptions.value = fetchedTopics;
    traineeOptions.value = fetchedParticipants.items
      .sort(
        (left, right) =>
          left.displayName.localeCompare(right.displayName, 'ru-RU') ||
          left.login.localeCompare(right.login, 'ru-RU'),
      )
      .map((item) => ({
        id: item.id,
        displayName: item.displayName,
        title: item.displayName,
      }));

    selectedTopicIds.value = selectedTopicIds.value.filter((topicId) =>
      fetchedTopics.some((topic) => topic.id === topicId),
    );

    if (!traineeOptions.value.some((item) => item.id === selectedTraineeId.value)) {
      selectedTraineeId.value = null;
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить тренировочные пресеты, темы и участников.',
    );
  } finally {
    loading.value = false;
  }
}

function goToPrevious() {
  if (activeIndex.value === 0) {
    return;
  }

  activeIndex.value -= 1;
}

function goToNext() {
  if (activeIndex.value >= sessionCards.value.length - 1) {
    return;
  }

  activeIndex.value += 1;
}

function updateCurrentState(state: TrainingCardState) {
  const card = currentCard.value;

  if (!card) {
    return;
  }

  sessionCards.value = sessionCards.value.map((item) =>
    item.id === card.id
      ? {
          ...item,
          state,
        }
      : item,
  );
}

async function revealAnswer() {
  if (!currentCard.value || currentCard.value.state !== 'pending') {
    return;
  }

  updateCurrentState('revealed');
  await nextTick();
  answerAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function recordCurrentResult(result: TrainingResultValue) {
  if (!currentCard.value) {
    return;
  }

  if (isTrainingResultValue(currentCard.value.state)) {
    return;
  }

  updateCurrentState(result);

  if (activeIndex.value < sessionCards.value.length - 1) {
    activeIndex.value += 1;
  }
}

async function prepareTraining() {
  if (isOtherUserMode.value && !selectedTrainee.value) {
    errorMessage.value = 'Выбери пользователя, для которого запускается тренировка.';
    return;
  }

  preparing.value = true;
  errorMessage.value = '';

  try {
    const prepared = await apiService.prepareTraining({
      topicIds: selectedTopicIds.value,
    });

    startSession(prepared.items, prepared.meta.topicBreakdown);
    pushToast(
      isOtherUserMode.value
        ? 'Тренировка для пользователя подготовлена.'
        : 'Тренировка подготовлена.',
    );
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось подготовить тренировку.',
    );
  } finally {
    preparing.value = false;
  }
}

function collectResolvedItems() {
  return sessionCards.value.flatMap((item) =>
    isTrainingResultValue(item.state)
      ? [
          {
            questionId: item.id,
            difficulty: item.difficulty,
            topicIds: item.topics.map((topic) => topic.id),
            result: item.state,
          },
        ]
      : [],
  );
}

async function persistSession(status: TrainingResultStatus) {
  const items = collectResolvedItems();

  if (items.length === 0) {
    resetSession();
    pushToast('Тренировка закрыта без сохранённых ответов.');
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  try {
    await apiService.saveTrainingResults({
      status,
      targetUserId: isActiveOtherUserMode.value ? activeTrainee.value?.id ?? undefined : undefined,
      feedback:
        isActiveOtherUserMode.value && sessionFeedback.value.trim()
          ? sessionFeedback.value.trim()
          : undefined,
      items,
    });

    resetSession();
    pushToast(
      isActiveOtherUserMode.value
        ? status === 'COMPLETED'
          ? 'Результаты и фидбек сохранены в карточку роста пользователя.'
          : 'Прогресс и фидбек сохранены в карточку роста пользователя.'
        : status === 'COMPLETED'
          ? 'Результаты тренировки сохранены.'
          : 'Прогресс тренировки сохранён.',
    );
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось сохранить результаты тренировки.',
    );
  } finally {
    saving.value = false;
  }
}

async function finishTraining() {
  if (!canFinish.value) {
    return;
  }

  await persistSession('COMPLETED');
}

async function saveAndExit() {
  await persistSession('ABANDONED_SAVED');
}

function exitWithoutSaving() {
  resetSession();
  pushToast('Тренировка закрыта без сохранения.');
}

watch(selectedPreset, (preset) => {
  if (!preset) {
    return;
  }

  selectedTopicIds.value = mergeTopicIds(
    selectedTopicIds.value,
    preset.topics.map((topic) => topic.id),
  );
});

watch(trainingMode, (mode) => {
  errorMessage.value = '';

  if (mode !== 'other-user') {
    selectedTraineeId.value = null;
  }
});

onMounted(() => {
  void loadInitialData();
});
</script>

<template>
  <section v-if="!isTrainingActive" class="page-frame">
    <section class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Режим</span>
        <strong>{{ isOtherUserMode ? 'Другой пользователь' : 'Себя' }}</strong>
        <small>{{ currentModeDescription }}</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Выбрано тегов</span>
        <strong>{{ selectedTopicsCount }}</strong>
        <small>Текущий пул для подбора тренировки.</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Доступно тегов</span>
        <strong>{{ availableTopics.length }}</strong>
        <small>Можно добавить вручную без смены флоу.</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Участники</span>
        <strong>{{ traineeOptions.length }}</strong>
        <small>Активные пользователи для взаимной тренировки.</small>
      </article>
    </section>

    <UiPanel class="form-panel training-setup-panel" padding="default" variant="form">
      <div class="panel-header">
        <div class="panel-copy">
          <h2>Собери набор тегов для тренировки</h2>
          <p class="page-copy">
            Пресет сразу добавляет свои теги в текущий пул. После этого набор можно вручную расширять или сокращать.
          </p>
        </div>
      </div>

      <section class="form-section">
        <div class="training-mode-switch__copy">
          <h2>Выбери сценарий</h2>
          <small>{{ currentModeDescription }}</small>
        </div>

        <div class="training-mode-switch">
          <UiButton
            v-for="option in modeOptions"
            :key="option.value"
            block
            :disabled="option.disabled"
            size="lg"
            :tone="trainingMode === option.value ? 'primary' : 'secondary'"
            @click="selectTrainingMode(option.value)"
          >
            {{ option.title }}
          </UiButton>
        </div>
      </section>

      <section v-if="isOtherUserMode" class="form-section">
        <div class="training-selection-panel__copy">
          <h2>Кому сохранить результат</h2>
          <small>
            Выбери активного пользователя. Его карточка роста получит оценки и финальный фидбек этой тренировки.
          </small>
        </div>

        <UiSelect
          v-model="selectedTraineeId"
          clearable
          item-title="title"
          item-value="id"
          :items="traineeOptions"
          label="Пользователь"
          :loading="loading"
          :hint="selectedTrainee
            ? `Результат будет записан в карточку роста ${selectedTrainee.displayName}.`
            : 'Выбери пользователя перед запуском тренировки.'"
        />

        <article v-if="selectedTrainee" class="training-target-card">
          <div class="training-target-card__copy">
            <span>Получатель результата</span>
            <strong>{{ selectedTrainee.displayName }}</strong>
          </div>
        </article>

        <div v-else class="empty-state empty-state-panel">
          <span>Пользователь</span>
          <p>{{ traineeOptions.length ? 'Пользователь не выбран' : 'Нет активных пользователей для тренировки' }}</p>
        </div>
      </section>

      <section class="form-section">
        <UiSelect
          v-model="selectedPresetId"
          clearable
          item-title="name"
          item-value="id"
          :items="presets"
          label="Пресет"
          :hint="selectedPreset
            ? `Выбран пресет: ${selectedPreset.name}. Его теги уже добавлены в набор.`
            : 'Выбор пресета сразу добавляет его теги в набор.'"
          :loading="loading"
        />
      </section>

      <section class="form-section">
        <div class="training-selection-panel__copy">
          <h2>Выбранный набор</h2>
          <small>
            {{
              selectedTopicsCount
                ? `${selectedTopicsCount} тегов попадут в подбор вопросов.`
                : 'Пул пуст. Выберите пресет или добавьте теги вручную.'
            }}
          </small>
        </div>

        <div v-if="selectedTopics.length" class="training-selection-panel__grid">
          <article
            v-for="topic in selectedTopics"
            :key="topic.id"
            class="training-selected-tag"
          >
            <div class="training-selected-tag__copy">
              <span>Тег</span>
              <strong>{{ topic.name }}</strong>
              <small>{{ formatTopicMeta(topic) }}</small>
            </div>
            <UiIconButton
              :icon="mdiClose"
              :label="`Убрать тег ${topic.name}`"
              class="training-selected-tag__action"
              tone="danger"
              @click="removeTopicFromSelection(topic.id)"
            />
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <span>Выбранные теги</span>
          <p>{{ loading ? 'Загрузка тегов' : 'Добавьте первый тег' }}</p>
        </div>
      </section>

      <section class="form-section">
        <div class="training-selection-panel__copy">
          <h2>Доступные теги</h2>
          <small>
            {{
              availableTopics.length
                ? 'Добавляйте теги вручную из каталога.'
                : 'Все доступные теги уже перенесены в выбранные.'
            }}
          </small>
        </div>

        <div v-if="availableTopics.length" class="training-topic-catalog">
          <article
            v-for="topic in availableTopics"
            :key="topic.id"
            class="training-topic-card"
          >
            <div class="training-topic-card__copy">
              <span>Тег</span>
              <strong>{{ topic.name }}</strong>
              <small>{{ formatTopicMeta(topic) }}</small>
            </div>
            <UiIconButton
              :icon="mdiPlus"
              :label="`Добавить тег ${topic.name}`"
              class="training-topic-card__action"
              @click="addTopicToSelection(topic.id)"
            />
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <span>Каталог тегов</span>
          <p>{{ loading ? 'Загрузка тегов' : 'Свободных тегов не осталось' }}</p>
        </div>
      </section>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton
            :disabled="!canPrepare"
            :icon="mdiPlayOutline"
            :loading="preparing"
            size="lg"
            @click="prepareTraining"
          >
            Подобрать вопросы
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
  </section>

  <section v-else class="page-frame training-arena">
    <UiPanel class="training-session-shell" padding="default" tone="muted" variant="detail">
      <div class="training-session-shell__topbar">
        <div class="training-session-shell__copy">
          <h2>{{ activeSessionTitle }}</h2>
          <small>{{ activeIndex + 1 }} / {{ sessionCards.length }} · {{ activeSessionMeta }}</small>
        </div>

        <div class="training-session-shell__topbar-actions">
          <v-chip :color="currentStatusColor" rounded="pill" size="small" variant="tonal">
            {{ currentStatusLabel }}
          </v-chip>
          <UiButton
            :icon="mdiExitRun"
            size="sm"
            tone="text"
            @click="exitDialogOpen = true"
          >
            Выйти
          </UiButton>
        </div>
      </div>

      <div class="training-session-shell__progress">
        <v-progress-linear class="training-progress-bar"
          bg-color="rgba(255,255,255,0.16)"
          color="secondary"
          height="10"
          :model-value="progressPercent"
          rounded
        />

        <div class="training-session-shell__breakdown">
          <span
            v-for="item in sessionBreakdown"
            :key="item.topic.id"
            class="training-session-shell__breakdown-item"
          >
            {{ item.topic.name }} · {{ item.selectedCount }}
          </span>
        </div>
      </div>

      <div class="training-session-stage">
        <UiIconButton
          :disabled="activeIndex === 0"
          :icon="mdiArrowLeft"
          class="training-session-stage__nav"
          label="Предыдущий вопрос"
          @click="goToPrevious"
        />

        <article v-if="currentCard" class="training-focus-card">
          <div class="training-focus-card__head">
            <div class="training-focus-card__context">
              <v-chip color="secondary" rounded="pill" size="small" variant="tonal">
                {{ currentCard.assignedTopic.name }}
              </v-chip>
              <DifficultyTag :difficulty="currentCard.difficulty" />
            </div>
          </div>

          <div class="training-focus-card__body">
            <span class="eyebrow">Вопрос</span>
            <QuestionContentRenderer
              class="training-focus-card__content"
              :content="currentCard.textContent"
            />
          </div>

          <div class="topic-stack">
            <v-chip
              v-for="topic in currentCard.topics"
              :key="topic.id"
              color="secondary"
              size="small"
              variant="tonal"
            >
              {{ topic.name }}
            </v-chip>
          </div>

          <div class="training-focus-card__actions" v-if="currentState === 'pending'">
            <UiButton :icon="mdiCardsOutline" size="lg" @click="revealAnswer">
              Показать ответ
            </UiButton>
            <UiButton
              :icon="mdiSkipNext"
              size="lg"
              tone="secondary"
              @click="recordCurrentResult('incorrect')"
            >
              Пропустить вопрос
            </UiButton>
          </div>

          <div
            v-if="isCurrentAnswerVisible"
            ref="answerAnchor"
            class="training-focus-card__answer"
          >
            <span class="eyebrow">Ответ</span>
            <QuestionContentRenderer
              class="training-focus-card__content training-focus-card__content--answer"
              :content="currentCard.answerContent"
            />

            <div class="training-focus-card__actions" v-if="currentState === 'revealed'">
              <UiButton :icon="mdiCheck" size="lg" @click="recordCurrentResult('correct')">
                Засчитать ответ
              </UiButton>
              <UiButton
                :icon="mdiMinus"
                size="lg"
                tone="secondary"
                @click="recordCurrentResult('partial')"
              >
                Частично
              </UiButton>
              <UiButton
                :icon="mdiClose"
                size="lg"
                tone="danger"
                @click="recordCurrentResult('incorrect')"
              >
                Не засчитать ответ
              </UiButton>
            </div>

            <div v-else class="training-focus-card__locked-result">
              <v-chip :color="currentStatusColor" rounded="pill" size="small" variant="tonal">
                {{ currentStatusLabel }}
              </v-chip>
              <small>Результат уже зафиксирован и не меняется навигацией.</small>
            </div>
          </div>
        </article>

        <UiIconButton
          :disabled="activeIndex >= sessionCards.length - 1"
          :icon="mdiArrowRight"
          class="training-session-stage__nav"
          label="Следующий вопрос"
          @click="goToNext"
        />
      </div>

      <section v-if="isActiveOtherUserMode" class="training-feedback-panel">
        <div class="training-feedback-panel__copy">
          <h2>Комментарий для карточки роста</h2>
          <small>
            Текст сохранится в карточке роста вместе с результатами этой тренировки.
          </small>
        </div>

        <UiField
          v-model="sessionFeedback"
          :maxlength="4000"
          hint="Опционально. Можно зафиксировать сильные стороны и зоны роста."
          label="Фидбек"
          placeholder="Что было хорошо и что нужно подтянуть"
          rows="4"
          textarea
        />
      </section>

      <div class="training-session-shell__footer">
        <small>{{ sessionFooterLabel }}</small>
        <UiButton
          v-if="canFinish"
          :icon="mdiCheck"
          :loading="saving"
          size="lg"
          @click="finishTraining"
        >
          Завершить тренировку
        </UiButton>
      </div>

      <v-alert
        v-if="errorMessage"
        class="mt-4"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>
    </UiPanel>

    <v-dialog v-model="exitDialogOpen" max-width="520">
      <UiPanel class="training-exit-dialog" padding="default" variant="detail">
        <div class="training-exit-dialog__copy">
          <h2>Выйти с сохранением прогресса или без него</h2>
          <small>{{ exitDialogDescription }}</small>
        </div>

        <div class="training-exit-dialog__actions">
          <UiButton
            :disabled="saving"
            :icon="mdiClose"
            size="lg"
            tone="text"
            @click="exitDialogOpen = false"
          >
            Остаться
          </UiButton>
          <UiButton
            :disabled="saving"
            :icon="mdiExitRun"
            size="lg"
            tone="secondary"
            @click="exitWithoutSaving"
          >
            Выйти без сохранения
          </UiButton>
          <UiButton
            :disabled="answeredCount === 0"
            :icon="mdiCheck"
            :loading="saving"
            size="lg"
            @click="saveAndExit"
          >
            Выйти с сохранением
          </UiButton>
        </div>
      </UiPanel>
    </v-dialog>
  </section>

  <v-snackbar
    v-model="snackbar.open"
    :color="snackbar.color"
    location="top right"
  >
    {{ snackbar.text }}
  </v-snackbar>
</template>
