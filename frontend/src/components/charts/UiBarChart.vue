<script setup lang="ts">
import { computed } from 'vue';

type BarItem = {
  label: string;
  value: number;
  color?: string;
  meta?: string;
};

const props = defineProps<{ items: BarItem[] }>();

const maxValue = computed(() => Math.max(1, ...props.items.map((item) => item.value)));

function barWidth(value: number) {
  return Math.max(2, Math.round((value / maxValue.value) * 100));
}
</script>

<template>
  <div class="chart-bar-list">
    <div v-for="item in items" :key="item.label" class="chart-bar-list__row">
      <div class="chart-bar-list__copy">
        <strong>{{ item.label }}</strong>
        <small>{{ item.meta ?? item.value }}</small>
      </div>

      <svg aria-hidden="true" class="chart-svg chart-svg--bar" viewBox="0 0 100 12" preserveAspectRatio="none">
        <rect x="0" y="1" width="100" height="10" rx="5" class="chart-svg__track" />
        <rect x="0" y="1" :width="barWidth(item.value)" height="10" rx="5" :fill="item.color || 'var(--color-cyan)'" />
      </svg>
    </div>
  </div>
</template>
