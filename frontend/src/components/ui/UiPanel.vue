<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
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
      `ui-panel--variant-${props.variant}`,
      `ui-panel--${props.tone}`,
      `ui-panel--${props.padding}`,
    ]"
    flat
  >
    <slot />
  </v-card>
</template>
