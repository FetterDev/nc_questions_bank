<script setup lang="ts">
import UiButton from './UiButton.vue';

withDefaults(defineProps<{
  disabled?: boolean;
  icon: string;
  label: string;
  tone?: 'danger' | 'icon';
}>(), {
  disabled: false,
  tone: 'icon',
});
</script>

<template>
  <UiButton
    :aria-label="label"
    :disabled="disabled"
    :icon="icon"
    size="sm"
    :tone="tone"
  />
</template>
