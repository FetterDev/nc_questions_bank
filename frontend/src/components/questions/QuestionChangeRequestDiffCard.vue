<script setup lang="ts">
import { computed } from 'vue';
import DifficultyTag from './DifficultyTag.vue';
import QuestionContentRenderer from './QuestionContentRenderer.vue';
import UiButton from '../ui/UiButton.vue';
import UiField from '../ui/UiField.vue';
import UiPanel from '../ui/UiPanel.vue';
import {
  buildChangeRequestSubject,
  formatChangeRequestStatus,
  formatChangeRequestType,
  statusTone,
} from '../../features/moderation/moderation.utils';
import type { QuestionChangeRequestDetail } from '../../features/moderation/moderation.types';
import { formatDate } from '../../features/questions/questions.utils';

const props = defineProps<{
  detail: QuestionChangeRequestDetail | null;
  loading: boolean;
  reviewComment?: string;
  reviewing?: boolean;
  showReviewActions?: boolean;
}>();

const emit = defineEmits<{
  (event: 'approve'): void;
  (event: 'reject'): void;
  (event: 'update:reviewComment', value: string): void;
}>();

const reviewCommentModel = computed({
  get: () => props.reviewComment ?? '',
  set: (value: string) => emit('update:reviewComment', value),
});
</script>

<template>
  <UiPanel class="detail-panel moderation-detail-card" variant="detail">
    <div v-if="loading" class="empty-state empty-state-panel">
      <p>Загрузка</p>
    </div>

    <div v-else-if="detail" class="moderation-detail detail-stack">
      <div class="panel-header moderation-detail__head">
        <div class="panel-copy">
          <h2>{{ buildChangeRequestSubject(detail) }}</h2>
          <p class="page-copy">
            {{ formatChangeRequestType(detail.type) }} · {{ formatDate(detail.createdAt) }}
          </p>
        </div>

        <div class="moderation-head__chips">
          <v-chip :color="statusTone(detail.status)" rounded="pill" variant="tonal">
            {{ formatChangeRequestStatus(detail.status) }}
          </v-chip>
          <v-chip color="secondary" rounded="pill" variant="tonal">
            {{ detail.author.displayName }}
          </v-chip>
        </div>
      </div>

      <div class="moderation-meta">
        <article class="moderation-meta__item">
          <span>Автор</span>
          <strong>{{ detail.author.displayName }}</strong>
          <small>{{ detail.author.email ?? 'Почта не задана' }}</small>
        </article>

        <article class="moderation-meta__item">
          <span>Ревьюер</span>
          <strong>{{ detail.reviewer?.displayName ?? 'Ещё не назначен' }}</strong>
          <small>{{ detail.reviewedAt ? formatDate(detail.reviewedAt) : 'Ожидает решения' }}</small>
        </article>

        <article class="moderation-meta__item">
          <span>Комментарий</span>
          <strong>{{ detail.reviewComment || 'Нет комментария' }}</strong>
          <small>{{ detail.targetQuestionId ?? 'Новая сущность' }}</small>
        </article>
      </div>

      <div class="moderation-diff-grid">
        <article class="moderation-diff-column">
          <p class="section-label">До</p>
          <div class="moderation-diff-content">
            <div class="moderation-diff-content__section">
              <span>Вопрос</span>
              <QuestionContentRenderer
                v-if="detail.before"
                class="moderation-diff-content__renderer"
                :content="detail.before.textContent"
              />
              <strong v-else>Новая запись</strong>
            </div>

            <div class="moderation-diff-content__section">
              <span>Ответ</span>
              <QuestionContentRenderer
                v-if="detail.before"
                class="moderation-diff-content__renderer moderation-diff-content__renderer--answer"
                :content="detail.before.answerContent"
              />
              <p v-else>Пусто</p>
            </div>
          </div>

          <div class="moderation-diff-fact">
            <span>Сложность</span>
            <DifficultyTag
              v-if="detail.before"
              :difficulty="detail.before.difficulty"
              size="small"
            />
            <strong v-else>—</strong>
          </div>

          <div class="moderation-diff-fact">
            <span>Компания</span>
            <v-chip
              v-if="detail.before?.company"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ detail.before.company.name }}
            </v-chip>
            <strong v-else>—</strong>
          </div>

          <div class="topic-stack">
            <v-chip
              v-for="topic in detail.before?.topics ?? []"
              :key="`before-${topic.slug}`"
              color="secondary"
              size="small"
              variant="tonal"
            >
              {{ topic.name }}
            </v-chip>
          </div>
        </article>

        <article class="moderation-diff-column moderation-diff-column--after">
          <p class="section-label">После</p>
          <div class="moderation-diff-content">
            <div class="moderation-diff-content__section">
              <span>Вопрос</span>
              <QuestionContentRenderer
                v-if="detail.after"
                class="moderation-diff-content__renderer"
                :content="detail.after.textContent"
              />
              <strong v-else>Удаление записи</strong>
            </div>

            <div class="moderation-diff-content__section">
              <span>Ответ</span>
              <QuestionContentRenderer
                v-if="detail.after"
                class="moderation-diff-content__renderer moderation-diff-content__renderer--answer"
                :content="detail.after.answerContent"
              />
              <p v-else>Пусто</p>
            </div>
          </div>

          <div class="moderation-diff-fact">
            <span>Сложность</span>
            <DifficultyTag
              v-if="detail.after"
              :difficulty="detail.after.difficulty"
              size="small"
            />
            <strong v-else>—</strong>
          </div>

          <div class="moderation-diff-fact">
            <span>Компания</span>
            <v-chip
              v-if="detail.after?.company"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ detail.after.company.name }}
            </v-chip>
            <strong v-else>—</strong>
          </div>

          <div class="topic-stack">
            <v-chip
              v-for="topic in detail.after?.topics ?? []"
              :key="`after-${topic.slug}`"
              color="secondary"
              size="small"
              variant="tonal"
            >
              {{ topic.name }}
            </v-chip>
          </div>
        </article>
      </div>

      <div class="insight-grid moderation-summary-grid">
        <article class="surface-card moderation-summary-card">
          <p class="section-label">Текст</p>
          <strong>{{ detail.fieldDiffs.text.changed ? 'Изменён' : 'Без изменений' }}</strong>
        </article>

        <article class="surface-card moderation-summary-card">
          <p class="section-label">Ответ</p>
          <strong>{{ detail.fieldDiffs.answer.changed ? 'Изменён' : 'Без изменений' }}</strong>
        </article>

        <article class="surface-card moderation-summary-card">
          <p class="section-label">Сложность</p>
          <div class="difficulty-pair">
            <DifficultyTag
              v-if="detail.fieldDiffs.difficulty.before"
              :difficulty="detail.fieldDiffs.difficulty.before"
              size="small"
            />
            <strong v-else>—</strong>
            <span aria-hidden="true">→</span>
            <DifficultyTag
              v-if="detail.fieldDiffs.difficulty.after"
              :difficulty="detail.fieldDiffs.difficulty.after"
              size="small"
            />
            <strong v-else>—</strong>
          </div>
        </article>

        <article class="surface-card moderation-summary-card">
          <p class="section-label">Компания</p>
          <div class="difficulty-pair">
            <v-chip
              v-if="detail.fieldDiffs.company.before"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ detail.fieldDiffs.company.before.name }}
            </v-chip>
            <strong v-else>—</strong>
            <span aria-hidden="true">→</span>
            <v-chip
              v-if="detail.fieldDiffs.company.after"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ detail.fieldDiffs.company.after.name }}
            </v-chip>
            <strong v-else>—</strong>
          </div>
        </article>

        <article class="surface-card moderation-summary-card">
          <p class="section-label">Темы</p>
          <strong>+{{ detail.fieldDiffs.topics.added.length }} / -{{ detail.fieldDiffs.topics.removed.length }}</strong>
          <small>
            {{ detail.fieldDiffs.topics.added.map((topic) => topic.name).join(', ') || 'Без добавлений' }}
          </small>
          <small>
            {{ detail.fieldDiffs.topics.removed.map((topic) => topic.name).join(', ') || 'Без удалений' }}
          </small>
        </article>
      </div>

      <div v-if="showReviewActions" class="moderation-review-form detail-stack">
        <section class="form-section">
          <UiField
            v-model="reviewCommentModel"
            auto-grow
            hint="Причина нужна только для отклонения."
            label="Причина отклонения"
            rows="3"
            textarea
          />
        </section>

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton
              tone="secondary"
              :loading="reviewing"
              @click="$emit('approve')"
            >
              Одобрить
            </UiButton>

            <UiButton
              :disabled="!reviewCommentModel.trim()"
              :loading="reviewing"
              tone="danger"
              @click="$emit('reject')"
            >
              Отклонить
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state empty-state-panel">
      <p>Заявка не выбрана</p>
    </div>
  </UiPanel>
</template>

<style scoped>
.difficulty-pair {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.difficulty-pair > span {
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
}
</style>
