<script setup lang="ts">
import { computed } from 'vue';

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

const props = defineProps<{
  segments: DonutSegment[];
  totalLabel?: string;
}>();

const total = computed(() =>
  Math.max(1, props.segments.reduce((sum, segment) => sum + segment.value, 0)),
);

const circles = computed(() => {
  let offset = 0;

  return props.segments.map((segment) => {
    const share = segment.value / total.value;
    const result = {
      ...segment,
      dasharray: `${share * 100} ${100 - share * 100}`,
      dashoffset: -offset,
    };

    offset += share * 100;
    return result;
  });
});
</script>

<template>
  <div class="chart-donut">
    <svg aria-hidden="true" class="chart-svg chart-svg--donut" viewBox="0 0 42 42">
      <circle class="chart-svg__donut-track" cx="21" cy="21" r="15.9155" />
      <circle
        v-for="segment in circles"
        :key="segment.label"
        class="chart-svg__donut-segment"
        cx="21"
        cy="21"
        r="15.9155"
        :stroke="segment.color"
        :stroke-dasharray="segment.dasharray"
        :stroke-dashoffset="segment.dashoffset"
      />
    </svg>

    <div class="chart-donut__center">
      <strong>{{ total }}</strong>
      <small>{{ totalLabel || 'результатов' }}</small>
    </div>

    <div class="chart-donut__legend">
      <div v-for="segment in segments" :key="segment.label" class="chart-donut__legend-item">
        <span :style="{ background: segment.color }" />
        <strong>{{ segment.label }}</strong>
        <small>{{ segment.value }}</small>
      </div>
    </div>
  </div>
</template>
