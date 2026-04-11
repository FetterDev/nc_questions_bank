<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { buttonStateMap, type ButtonTone } from '../../theme/button-state-map';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  block?: boolean;
  disabled?: boolean;
  icon?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'ghost' | ButtonTone;
}>(), {
  block: false,
  disabled: false,
  icon: undefined,
  loading: false,
  size: 'md',
  tone: 'primary',
});

const attrs = useAttrs();

const normalizedTone = computed<ButtonTone>(() =>
  props.tone === 'ghost' ? 'text' : props.tone,
);

const variant = computed(() => {
  if (normalizedTone.value === 'secondary') {
    return 'outlined';
  }

  if (normalizedTone.value === 'text' || normalizedTone.value === 'icon') {
    return 'text';
  }

  return 'flat';
});

const buttonType = computed(() =>
  typeof attrs.type === 'string' ? attrs.type : 'button',
);

const cssVars = computed(() => {
  const state = props.disabled ? 'disabled' : 'default';
  const tone = normalizedTone.value;
  const current = buttonStateMap[tone][state];
  const hover = buttonStateMap[tone].hover;

  return {
    '--ui-button-bg': current.background,
    '--ui-button-color': current.color,
    '--ui-button-border': current.border,
    '--ui-button-hover-bg': hover.background,
    '--ui-button-hover-color': hover.color,
    '--ui-button-hover-border': hover.border,
  };
});
</script>

<template>
  <v-btn
    v-bind="attrs"
    :block="block"
    :class="[
      'ui-button',
      `ui-button--${normalizedTone}`,
      `ui-button--${size}`,
      { 'ui-button--block': block },
    ]"
    :disabled="disabled"
    :loading="loading"
    :prepend-icon="icon"
    :style="cssVars"
    :type="buttonType"
    :variant="variant"
  >
    <slot />
  </v-btn>
</template>
