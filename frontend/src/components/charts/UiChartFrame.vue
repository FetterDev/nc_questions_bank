<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="chart-frame">
    <div class="chart-frame__head">
      <p v-if="subtitle" class="section-label">{{ subtitle }}</p>
      <h3>{{ title }}</h3>
    </div>
    <div class="chart-frame__body">
      <slot />
    </div>
  </div>
</template>
