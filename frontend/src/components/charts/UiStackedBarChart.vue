<script setup lang="ts">
type Segment = {
  value: number;
  color: string;
  label?: string;
};

type StackedItem = {
  label: string;
  segments: Segment[];
  meta?: string;
};

defineProps<{ items: StackedItem[] }>();

function total(segments: Segment[]) {
  return Math.max(1, segments.reduce((sum, item) => sum + item.value, 0));
}

function width(value: number, all: number) {
  return Math.max(0, (value / all) * 100);
}
</script>

<template>
  <div class="chart-stacked-list">
    <div v-for="item in items" :key="item.label" class="chart-stacked-list__row">
      <div class="chart-bar-list__copy">
        <strong>{{ item.label }}</strong>
        <small>{{ item.meta ?? '' }}</small>
      </div>

      <svg aria-hidden="true" class="chart-svg chart-svg--bar" viewBox="0 0 100 12" preserveAspectRatio="none">
        <rect x="0" y="1" width="100" height="10" rx="5" class="chart-svg__track" />
        <template v-for="(segment, index) in item.segments" :key="`${item.label}:${index}`">
          <rect
            :x="item.segments.slice(0, index).reduce((sum, current) => sum + width(current.value, total(item.segments)), 0)"
            y="1"
            :width="width(segment.value, total(item.segments))"
            height="10"
            rx="5"
            :fill="segment.color"
          />
        </template>
      </svg>
    </div>
  </div>
</template>
