<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import UiButton from './UiButton.vue';

defineProps<{
  active?: boolean;
  icon: string;
  label: string;
  to: RouteLocationRaw;
}>();
</script>

<template>
  <UiButton
    :class="[
      'ui-shell-nav-item',
      { 'ui-shell-nav-item--active': active },
    ]"
    block
    :icon="icon"
    size="lg"
    :to="to"
    tone="text"
  >
    <span class="ui-shell-nav-item__label">{{ label }}</span>
  </UiButton>
</template>
