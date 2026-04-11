<script setup lang="ts">
defineProps<{
  difficultyFilterLabel: string;
  lastSyncedAt: string;
  page: number;
  total: number;
  totalPages: number;
  visibleItemsRange: string;
}>();
</script>

<template>
  <section class="summary-strip metrics-grid">
    <article class="surface-card summary-stat">
      <span>Всего</span>
      <strong>{{ total }}</strong>
      <small>Опубликованные вопросы</small>
    </article>

    <article class="surface-card summary-stat">
      <span>Диапазон</span>
      <strong>{{ visibleItemsRange }}</strong>
      <small>Страница {{ page }} / {{ totalPages }}</small>
    </article>

    <article class="surface-card summary-stat">
      <span>Фильтр</span>
      <strong>{{ difficultyFilterLabel }}</strong>
      <small>{{ lastSyncedAt ? `Обновлено ${lastSyncedAt}` : 'Без синхронизации' }}</small>
    </article>
  </section>
</template>
