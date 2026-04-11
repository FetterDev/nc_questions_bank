<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  itemTitle?: string;
  itemValue?: string;
  items: unknown[];
  label: string;
  loading?: boolean;
  modelValue: unknown;
  required?: boolean;
}>(), {
  error: '',
  hint: '',
  hideLabel: false,
  itemTitle: 'title',
  itemValue: 'value',
  loading: false,
  required: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();
</script>

<template>
  <div class="ui-control ui-select">
    <label v-if="!hideLabel" class="ui-control__label">
      <span>{{ label }}</span>
      <span v-if="required" class="ui-control__required" aria-hidden="true">*</span>
    </label>

    <v-select
      v-bind="attrs"
      class="ui-control__input"
      :error-messages="error ? [error] : undefined"
      hide-details="auto"
      :item-title="itemTitle"
      :item-value="itemValue"
      :items="items"
      :loading="loading"
      :menu-icon="undefined"
      :model-value="modelValue"
      :variant="'plain'"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <p v-if="hint" class="ui-control__hint">
      {{ hint }}
    </p>
  </div>
</template>
