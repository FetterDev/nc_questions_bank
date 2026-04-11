<script setup lang="ts">
import { computed } from 'vue';
import { formatDifficulty } from '../../features/questions/questions.utils';
import type { DifficultyValue } from '../../features/questions/questions.types';

const props = withDefaults(defineProps<{
  difficulty: DifficultyValue;
  size?: 'default' | 'small';
}>(), {
  size: 'default',
});

const label = computed(() => formatDifficulty(props.difficulty));
</script>

<template>
  <span
    class="difficulty-tag"
    :class="`difficulty-tag--${difficulty}`"
    :data-size="size"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.difficulty-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--pill-radius);
  font-family: var(--font-ui);
  font-size: var(--font-size-small);
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.difficulty-tag[data-size='small'] {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

.difficulty-tag--junior {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-tag-junior) 28%, var(--color-paper));
  background: color-mix(in srgb, var(--color-tag-junior) 14%, var(--color-paper));
}

.difficulty-tag--middle {
  color: var(--color-warning);
  border-color: color-mix(in srgb, var(--color-tag-middle) 32%, var(--color-paper));
  background: color-mix(in srgb, var(--color-tag-middle) 18%, var(--color-paper));
}

.difficulty-tag--senior {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-tag-senior) 28%, var(--color-paper));
  background: color-mix(in srgb, var(--color-tag-senior) 12%, var(--color-paper));
}

.difficulty-tag--lead {
  color: #5f379d;
  border-color: color-mix(in srgb, var(--color-tag-lead) 28%, var(--color-paper));
  background: color-mix(in srgb, var(--color-tag-lead) 12%, var(--color-paper));
}
</style>
