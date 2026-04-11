<script setup lang="ts">
import { useRouter } from 'vue-router';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { useBankAnalysis } from '../composables/useBankAnalysis';

const router = useRouter();
const {
  difficultyMix,
  dominantDifficulty,
  errorMessage,
  focusItems,
  loading,
  snapshotLabel,
  sparseTopics,
  topTopics,
} = useBankAnalysis();

function openRoute(routeName: 'question-bank' | 'question-editor-create') {
  void router.push({ name: routeName });
}
</script>

<template>
  <section class="page-frame">
    <div class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Снимок</span>
        <strong>{{ snapshotLabel }}</strong>
        <small>Опубликованный банк</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Ведущий уровень</span>
        <strong>{{ dominantDifficulty }}</strong>
        <small>Самая частая сложность</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Редкие темы</span>
        <strong>{{ sparseTopics.length }}</strong>
        <small>Слабое покрытие</small>
      </article>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <UiPanel v-if="loading" class="empty-state empty-state-panel growth-loading" variant="empty">
      <p>Загрузка</p>
    </UiPanel>

    <UiPanel v-else-if="focusItems.length" class="content-panel insights-panel" padding="default" variant="detail">
      <div class="panel-header">
        <div class="panel-copy">
          <h2>Короткая аналитика по текущему published-слою</h2>
        </div>
      </div>

      <div class="insight-grid">
        <article
          v-for="item in focusItems"
          :key="item.title"
          class="focus-card focus-card--nested"
        >
          <div class="focus-card__head">
            <p class="section-label">Вывод</p>
            <v-chip :color="item.color" rounded="pill" size="small" variant="tonal">
              {{ item.title }}
            </v-chip>
          </div>

          <p class="page-copy">
            {{ item.description }}
          </p>

          <div class="focus-card__source">
            <span class="field-label">Источник</span>
            <strong>{{ item.source }}</strong>
          </div>

          <div class="focus-card__actions">
            <UiButton @click="openRoute(item.routeName)">
              {{ item.actionLabel }}
            </UiButton>
          </div>
        </article>
      </div>
    </UiPanel>

    <UiPanel v-else class="empty-state empty-state-panel" variant="empty">
      <p>Данных нет</p>
    </UiPanel>

    <div class="metrics-grid">
      <UiPanel class="content-panel growth-panel" variant="detail">
        <p class="section-label">Баланс сложности</p>
        <div class="difficulty-stack">
          <div
            v-for="item in difficultyMix"
            :key="item.difficulty"
            class="bar-row"
          >
            <div class="bar-row__label">
              <span>{{ item.label }}</span>
              <strong>{{ item.count }} / {{ item.share }}%</strong>
            </div>
            <div class="meter">
              <span :style="{ width: `${item.share}%` }" />
            </div>
          </div>
        </div>
      </UiPanel>

      <UiPanel class="content-panel growth-panel" variant="detail">
        <p class="section-label">Насыщенные темы</p>
        <div v-if="topTopics.length" class="topic-grid">
          <div
            v-for="topic in topTopics"
            :key="topic.topicId"
            class="topic-chip"
          >
            <strong>{{ topic.name }}</strong>
            <span>{{ topic.count }}</span>
          </div>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>Пусто</p>
        </div>
      </UiPanel>

      <UiPanel class="content-panel growth-panel" variant="detail">
        <p class="section-label">Редкие темы</p>
        <div v-if="sparseTopics.length" class="topic-grid">
          <div
            v-for="topic in sparseTopics"
            :key="topic.topicId"
            class="topic-chip topic-chip--muted"
          >
            <strong>{{ topic.name }}</strong>
            <span>{{ topic.count }}</span>
          </div>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>Пусто</p>
        </div>
      </UiPanel>
    </div>
  </section>
</template>
