<script setup lang="ts">
import { mdiHistory, mdiRunFast, mdiTextBoxSearchOutline } from '@mdi/js';
import DifficultyTag from '../components/questions/DifficultyTag.vue';
import QuestionContentRenderer from '../components/questions/QuestionContentRenderer.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import {
  formatTrainingResultCompact,
  trainingResultColor,
} from '../features/training/training.utils';
import { useGrowthCard } from '../composables/useGrowthCard';

const {
  answeredQuestions,
  errorMessage,
  failedQuestions,
  feedbackEntries,
  growthAreaProgress,
  loading,
  recommendations,
  snapshotLabel,
  summary,
  weakTopics,
} = useGrowthCard();
</script>

<template>
  <section class="page-frame">
    <div class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Снимок</span>
        <strong>{{ snapshotLabel }}</strong>
        <small>История тренировок</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Correct</span>
        <strong>{{ summary.correctCount }}</strong>
        <small>Полностью засчитанные ответы</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Partial</span>
        <strong>{{ summary.partialCount }}</strong>
        <small>Частично засчитанные ответы</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Incorrect</span>
        <strong>{{ summary.incorrectCount }}</strong>
        <small>Не засчитанные ответы</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Accuracy</span>
        <strong>{{ summary.accuracy }}%</strong>
        <small>{{ summary.totalResults }} сохранённых результата</small>
      </article>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading" class="growth-loading empty-state empty-state-panel" variant="empty">
      <p>Загрузка</p>
    </UiPanel>

    <UiPanel
      v-else-if="summary.totalResults === 0"
      class="empty-state empty-state-panel"
      padding="default"
      variant="empty"
    >
      <p>Пока нет сохранённых тренировок</p>
      <span>Заверши тренировку или выйди с сохранением прогресса, чтобы появились точки роста.</span>
      <div class="empty-state__actions">
        <UiButton :icon="mdiRunFast" :to="{ name: 'training' }" size="lg">
          Открыть тренировку
        </UiButton>
      </div>
    </UiPanel>

    <div v-else class="growth-user-layout">
      <div class="growth-primary-stack">
        <UiPanel class="growth-stack-panel detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Рекомендации</h2>
            </div>
          </div>

          <div v-if="recommendations.length" class="growth-topic-list">
            <article
              v-for="item in recommendations"
              :key="`${item.kind}-${item.priority}`"
              class="growth-topic-row"
            >
              <div>
                <strong>{{ item.kind }}</strong>
                <small>{{ item.text }}</small>
              </div>
              <v-chip color="secondary" rounded="pill" size="small" variant="tonal">
                P{{ item.priority }}
              </v-chip>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Нет рекомендаций</p>
          </div>
        </UiPanel>

        <UiPanel class="growth-stack-panel detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Последние комментарии</h2>
            </div>
            <UiButton
              :icon="mdiHistory"
              :to="{ name: 'training-history' }"
              size="sm"
              tone="text"
            >
              История
            </UiButton>
          </div>

          <div v-if="feedbackEntries.length" class="growth-feedback-list">
            <article
              v-for="entry in feedbackEntries"
              :key="entry.sessionId"
              class="growth-feedback-card"
            >
              <div class="growth-feedback-card__head">
                <div>
                  <strong>{{ entry.trainer?.displayName ?? 'Внешний тренер' }}</strong>
                  <small>{{ entry.trainer?.login ?? 'system' }}</small>
                </div>
                <small>{{ new Date(entry.finishedAt).toLocaleString('ru-RU') }}</small>
              </div>
              <p>{{ entry.feedback }}</p>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пока нет фидбека</p>
          </div>
        </UiPanel>

        <UiPanel class="growth-stack-panel detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Приоритет на доработку</h2>
            </div>
            <UiButton
              :icon="mdiRunFast"
              :to="{ name: 'training' }"
              size="sm"
              tone="secondary"
            >
              В тренировку
            </UiButton>
          </div>

          <div v-if="weakTopics.length" class="growth-topic-list">
            <article
              v-for="topic in weakTopics"
              :key="topic.topicId"
              class="growth-topic-row"
            >
              <div>
                <strong>{{ topic.name }}</strong>
                <small>
                  {{ topic.incorrectCount }} incorrect / {{ topic.partialCount }} partial / {{ topic.correctCount }} correct
                </small>
              </div>
              <v-chip color="secondary" rounded="pill" size="small" variant="tonal">
                {{ topic.accuracy }}%
              </v-chip>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пусто</p>
          </div>
        </UiPanel>

        <UiPanel class="growth-stack-panel detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Прогресс по зонам роста</h2>
            </div>
          </div>

          <div v-if="growthAreaProgress.length" class="growth-topic-list">
            <article
              v-for="item in growthAreaProgress"
              :key="item.competencyId"
              class="growth-topic-row"
            >
              <div>
                <strong>{{ item.name }}</strong>
                <small>{{ item.latestGrowthArea }}</small>
                <small>
                  {{ item.totalGrowthPoints }} точек · {{ item.resolvedCount }} закрыто · {{ item.accuracy }}%
                </small>
              </div>
              <v-chip
                :color="item.currentStatus === 'resolved' ? 'success' : 'warning'"
                rounded="pill"
                size="small"
                variant="tonal"
              >
                {{ item.currentStatus }}
              </v-chip>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Пока нет зон роста</p>
          </div>
        </UiPanel>
      </div>

      <div class="growth-secondary-stack">
        <UiPanel class="growth-stack-panel detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Последний результат incorrect или partial</h2>
            </div>
            <UiButton
              :icon="mdiTextBoxSearchOutline"
              :to="{ name: 'question-bank' }"
              size="sm"
              tone="text"
            >
              Открыть банк
            </UiButton>
          </div>

          <div v-if="failedQuestions.length" class="growth-question-list">
            <article
              v-for="question in failedQuestions"
              :key="question.questionId"
              class="growth-question-card growth-question-card--danger"
            >
              <div class="growth-question-card__head">
                <DifficultyTag :difficulty="question.difficulty" />
                <span
                  class="status-badge"
                  :class="question.lastResult === 'partial' ? 'status-badge--warning' : 'status-badge--danger'"
                >
                  {{ formatTrainingResultCompact(question.lastResult) }}
                </span>
              </div>

              <QuestionContentRenderer
                class="growth-question-card__title"
                compact
                :content="question.textContent"
              />

              <div class="topic-stack">
                <v-chip
                  v-for="topic in question.topics"
                  :key="topic.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ topic.name }}
                </v-chip>
              </div>

              <small>
                {{ question.incorrectCount }} incorrect / {{ question.partialCount }} partial / {{ question.correctCount }} correct · {{ new Date(question.lastAnsweredAt).toLocaleString('ru-RU') }}
              </small>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Нет провалов</p>
          </div>
        </UiPanel>

        <UiPanel class="growth-stack-panel growth-stack-panel--muted detail-panel" padding="default" variant="detail">
          <div class="growth-stack-panel__head">
            <div>
              <h2>Последний результат correct</h2>
            </div>
          </div>

          <div v-if="answeredQuestions.length" class="growth-question-list">
            <article
              v-for="question in answeredQuestions"
              :key="question.questionId"
              class="growth-question-card growth-question-card--success"
            >
              <div class="growth-question-card__head">
                <DifficultyTag :difficulty="question.difficulty" />
                <span
                  class="status-badge"
                  :class="`status-badge--${trainingResultColor(question.lastResult)}`"
                >
                  {{ formatTrainingResultCompact(question.lastResult) }}
                </span>
              </div>

              <QuestionContentRenderer
                class="growth-question-card__title"
                compact
                :content="question.textContent"
              />

              <div class="topic-stack">
                <v-chip
                  v-for="topic in question.topics"
                  :key="topic.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ topic.name }}
                </v-chip>
              </div>

              <small>
                {{ question.correctCount }} correct / {{ question.partialCount }} partial / {{ question.incorrectCount }} incorrect · {{ new Date(question.lastAnsweredAt).toLocaleString('ru-RU') }}
              </small>
            </article>
          </div>
          <div v-else class="empty-state empty-state-panel">
            <p>Нет успешных ответов</p>
          </div>
        </UiPanel>
      </div>
    </div>
  </section>
</template>
