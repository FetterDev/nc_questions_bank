<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  padding?: 'compact' | 'default' | 'none';
  tone?: 'default' | 'muted';
  variant?: 'compact' | 'default' | 'detail' | 'empty' | 'form' | 'table' | 'toolbar';
}>(), {
  padding: 'default',
  tone: 'default',
  variant: 'default',
});

const attrs = useAttrs();
</script>

<template>
  <v-card
    v-bind="attrs"
    :class="[
      'surface-card',
      'ui-panel',
      `ui-panel--variant-${variant}`,
      `ui-panel--${tone}`,
      `ui-panel--${padding}`,
    ]"
    flat
  >
    <slot />
  </v-card>
</template>
