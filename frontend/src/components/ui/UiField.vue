<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  label: string;
  modelValue: string | null;
  required?: boolean;
  textarea?: boolean;
}>(), {
  error: '',
  hint: '',
  hideLabel: false,
  required: false,
  textarea: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const attrs = useAttrs();

function updateValue(value: string | null) {
  emit('update:modelValue', value ?? '');
}
</script>

<template>
  <div
    :class="[
      'ui-control',
      'ui-field',
      { 'ui-control--textarea': textarea },
    ]"
  >
    <label v-if="!hideLabel" class="ui-control__label">
      <span>{{ label }}</span>
      <span v-if="required" class="ui-control__required" aria-hidden="true">*</span>
    </label>

    <v-textarea
      v-if="textarea"
      v-bind="attrs"
      class="ui-control__input"
      :error-messages="error ? [error] : undefined"
      hide-details="auto"
      :model-value="modelValue"
      :variant="'plain'"
      @update:model-value="updateValue"
    >
      <template v-if="$slots.prepend" #prepend>
        <slot name="prepend" />
      </template>
      <template v-if="$slots['prepend-inner']" #prepend-inner>
        <slot name="prepend-inner" />
      </template>
      <template v-if="$slots['append-inner']" #append-inner>
        <slot name="append-inner" />
      </template>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </v-textarea>

    <v-text-field
      v-else
      v-bind="attrs"
      class="ui-control__input"
      :error-messages="error ? [error] : undefined"
      hide-details="auto"
      :model-value="modelValue"
      :variant="'plain'"
      @update:model-value="updateValue"
    >
      <template v-if="$slots.prepend" #prepend>
        <slot name="prepend" />
      </template>
      <template v-if="$slots['prepend-inner']" #prepend-inner>
        <slot name="prepend-inner" />
      </template>
      <template v-if="$slots['append-inner']" #append-inner>
        <slot name="append-inner" />
      </template>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </v-text-field>

    <p v-if="hint" class="ui-control__hint">
      {{ hint }}
    </p>
  </div>
</template>
