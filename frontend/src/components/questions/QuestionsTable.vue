<script setup lang="ts">
import { computed } from 'vue';
import { mdiDeleteOutline, mdiPencilOutline } from '@mdi/js';
import DifficultyTag from './DifficultyTag.vue';
import QuestionContentRenderer from './QuestionContentRenderer.vue';
import UiIconButton from '../ui/UiIconButton.vue';
import UiPanel from '../ui/UiPanel.vue';
import type { Question } from '../../features/questions/questions.types';

const props = defineProps<{
  canManagePublishedQuestions: boolean;
  loading: boolean;
  page: number;
  questions: Question[];
  totalPages: number;
  visibleItemsRange: string;
}>();

const emit = defineEmits<{
  (event: 'delete', question: Question): void;
  (event: 'open', question: Question): void;
  (event: 'edit', question: Question): void;
  (event: 'update:page', value: number): void;
}>();

const pageModel = computed({
  get: () => props.page,
  set: (value: number) => emit('update:page', value),
});

function formatEncounterCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} раз`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} раза`;
  }

  return `${count} раз`;
}
</script>

<template>
  <UiPanel class="table-frame questions-list-panel" variant="table">
    <div class="table-frame__header">
      <span class="table-card__caption">{{ visibleItemsRange }}</span>
    </div>

    <div class="table-frame__surface">
      <div v-if="loading && !questions.length" class="empty-state empty-state-panel">
        <p>Загрузка</p>
      </div>

      <div v-else-if="questions.length" class="questions-list">
        <div
          class="list-head list-head--questions"
          :class="canManagePublishedQuestions ? 'list-head--questions-admin' : 'list-head--questions-user'"
        >
          <span>Вопрос</span>
          <span>Сложность</span>
          <span>Темы</span>
          <span>Встречал на собесе</span>
          <span v-if="canManagePublishedQuestions">Действия</span>
        </div>

        <article
          v-for="question in questions"
          :key="question.id"
          class="list-row question-row"
          :class="{
            'list-row--pending': question.pendingChangeRequest.hasPendingChangeRequest,
            'question-row--admin': canManagePublishedQuestions,
            'question-row--user': !canManagePublishedQuestions,
          }"
        >
          <button
            class="question-cell question-cell--interactive"
            type="button"
            @click="$emit('open', question)"
          >
            <div class="question-cell__section">
              <span class="question-cell__label">Вопрос</span>
              <QuestionContentRenderer
                class="question-cell__content"
                compact
                :content="question.textContent"
              />
              <v-chip
                v-if="question.company"
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ question.company.name }}
              </v-chip>
            </div>
          </button>

          <div class="list-cell">
            <DifficultyTag :difficulty="question.difficulty" />
          </div>

          <div class="list-cell">
            <div class="topic-stack">
              <v-chip
                v-for="topic in question.topics"
                :key="topic.id"
                color="secondary"
                variant="tonal"
                size="small"
              >
                {{ topic.name }}
              </v-chip>
            </div>
          </div>

          <div class="list-cell question-encounter-cell">
            <span class="status-badge status-badge--ready">
              {{ formatEncounterCount(question.interviewEncounter.count) }}
            </span>
          </div>

          <div v-if="canManagePublishedQuestions" class="row-actions row-actions--compact">
            <UiIconButton
              :disabled="question.pendingChangeRequest.hasPendingChangeRequest"
              :icon="mdiPencilOutline"
              label="Изменить вопрос"
              title="Изменить вопрос"
              @click="$emit('edit', question)"
            />

            <UiIconButton
              :disabled="question.pendingChangeRequest.hasPendingChangeRequest"
              :icon="mdiDeleteOutline"
              label="Удалить вопрос"
              title="Удалить вопрос"
              tone="danger"
              @click="$emit('delete', question)"
            />
          </div>
        </article>
      </div>

      <div v-else class="empty-state empty-state-panel">
        <p>Ничего не найдено</p>
        <span>Измени фильтры или создай новый вопрос.</span>
      </div>
    </div>

    <div class="action-footer">
      <span>{{ visibleItemsRange }}</span>

      <v-pagination
        v-model="pageModel"
        :length="totalPages"
        :total-visible="5"
        color="primary"
      />
    </div>
  </UiPanel>
</template>
