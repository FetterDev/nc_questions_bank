<script setup lang="ts">
import { mdiCodeTags, mdiClose } from '@mdi/js';
import UiButton from '../ui/UiButton.vue';
import UiField from '../ui/UiField.vue';
import UiSelect from '../ui/UiSelect.vue';
import QuestionCodeEditor from './QuestionCodeEditor.vue';
import { questionCodeLanguageOptions } from '../../features/questions/questions.constants';
import { createQuestionStructuredContent } from '../../features/questions/questions.utils';
import type {
  QuestionCodeLanguage,
  QuestionStructuredContent,
} from '../../features/questions/questions.types';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  error?: string;
  hint?: string;
  label: string;
  modelValue: QuestionStructuredContent;
}>(), {
  disabled: false,
  error: '',
  hint: '',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: QuestionStructuredContent): void;
}>();

function updateText(text: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    text,
  });
}

function updateCode(code: string) {
  emit('update:modelValue', {
    text: props.modelValue.text,
    code,
    ...(code.trim()
      ? { codeLanguage: props.modelValue.codeLanguage ?? 'typescript' }
      : {}),
  });
}

function updateCodeLanguage(codeLanguage: unknown) {
  if (typeof codeLanguage !== 'string' || !codeLanguage) {
    emit('update:modelValue', {
      text: props.modelValue.text,
      ...(props.modelValue.code ? { code: props.modelValue.code } : {}),
    });
    return;
  }

  emit('update:modelValue', {
    text: props.modelValue.text,
    ...(props.modelValue.code ? { code: props.modelValue.code } : {}),
    codeLanguage: codeLanguage as QuestionCodeLanguage,
  });
}

function toggleCode() {
  if (props.modelValue.code?.trim()) {
    emit(
      'update:modelValue',
      createQuestionStructuredContent(props.modelValue.text),
    );
    return;
  }

  emit('update:modelValue', {
    text: props.modelValue.text,
    code: '',
    codeLanguage: 'typescript',
  });
}
</script>

<template>
  <section class="structured-editor">
    <div class="structured-editor__head">
      <div class="structured-editor__copy">
        <p class="field-label">{{ label }}</p>
        <small v-if="hint">{{ hint }}</small>
      </div>

      <UiButton
        :disabled="disabled"
        :icon="modelValue.code !== undefined ? mdiClose : mdiCodeTags"
        size="sm"
        tone="secondary"
        @click="toggleCode"
      >
        {{ modelValue.code !== undefined ? 'Убрать код' : 'Добавить код' }}
      </UiButton>
    </div>

    <UiField
      auto-grow
      :disabled="disabled"
      :error="error"
      label="Текст"
      placeholder="Введите основной текст"
      required
      rows="4"
      textarea
      :model-value="modelValue.text"
      @update:model-value="updateText"
    />

    <div v-if="modelValue.code !== undefined" class="structured-editor__code">
      <UiSelect
        :disabled="disabled || !modelValue.code?.trim()"
        hint="Только JS/TS-снипеты."
        :items="questionCodeLanguageOptions"
        label="Язык кода"
        :model-value="modelValue.codeLanguage ?? null"
        @update:model-value="updateCodeLanguage"
      />

      <div class="structured-editor__code-field">
        <label class="ui-control__label">
          <span>Код</span>
        </label>
        <QuestionCodeEditor
          :disabled="disabled"
          :language="modelValue.codeLanguage"
          :model-value="modelValue.code ?? ''"
          placeholder="Вставьте снипет"
          @update:model-value="updateCode"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.structured-editor,
.structured-editor__copy,
.structured-editor__code,
.structured-editor__code-field {
  display: grid;
  gap: 12px;
}

.structured-editor__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.structured-editor__copy small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-small);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .structured-editor__head {
    flex-direction: column;
  }
}
</style>
