<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  itemTitle?: string;
  itemValue?: string;
  items: unknown[];
  label: string;
  loading?: boolean;
  modelValue: unknown;
  multiple?: boolean;
  required?: boolean;
}>(), {
  error: '',
  hint: '',
  hideLabel: false,
  itemTitle: 'title',
  itemValue: 'value',
  loading: false,
  multiple: false,
  required: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void;
}>();

const attrs = useAttrs();

function updateValue(value: unknown) {
  if (props.multiple) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
    return;
  }

  emit('update:modelValue', value ?? null);
}
</script>

<template>
  <div class="ui-control ui-autocomplete">
    <label v-if="!hideLabel" class="ui-control__label">
      <span>{{ label }}</span>
      <span v-if="required" class="ui-control__required" aria-hidden="true">*</span>
    </label>

    <v-autocomplete
      v-bind="attrs"
      class="ui-control__input"
      density="comfortable"
      :error-messages="error ? [error] : undefined"
      hide-details="auto"
      :item-title="itemTitle"
      :item-value="itemValue"
      :items="items"
      :loading="loading"
      :menu-icon="undefined"
      :model-value="modelValue"
      :multiple="multiple"
      :variant="'plain'"
      @update:model-value="updateValue"
    />

    <p v-if="hint" class="ui-control__hint">
      {{ hint }}
    </p>
  </div>
</template>
