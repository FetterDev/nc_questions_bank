<script setup lang="ts">
import { mdiClose, mdiCodeTags } from '@mdi/js';
import UiButton from '../ui/UiButton.vue';
import UiField from '../ui/UiField.vue';
import UiSelect from '../ui/UiSelect.vue';
import QuestionCodeEditor from './QuestionCodeEditor.vue';
import { questionCodeLanguageOptions } from '../../features/questions/questions.constants';
import {
  cloneQuestionStructuredContent,
  createQuestionCodeBlock,
  createQuestionStructuredContent,
  createQuestionTextBlock,
} from '../../features/questions/questions.utils';
import type {
  QuestionCodeLanguage,
  QuestionCodeContentBlock,
  QuestionStructuredContent,
  QuestionTextContentBlock,
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

function replaceBlocks(nextBlocks: QuestionStructuredContent) {
  emit(
    'update:modelValue',
    nextBlocks.length > 0 ? nextBlocks : createQuestionStructuredContent(),
  );
}

function updateTextBlock(index: number, content: string) {
  const next = cloneQuestionStructuredContent(props.modelValue);
  next[index] = createQuestionTextBlock(content) as QuestionTextContentBlock;
  replaceBlocks(next);
}

function updateCodeBlock(index: number, content: string) {
  const next = cloneQuestionStructuredContent(props.modelValue);
  const current = next[index] as QuestionCodeContentBlock;
  const normalizedContent = content;

  next[index] = {
    kind: 'code',
    content: normalizedContent,
    ...(normalizedContent.trim()
      ? { language: current.language ?? 'typescript' }
      : current.language
        ? { language: current.language }
        : {}),
  };

  replaceBlocks(next);
}

function updateCodeLanguage(index: number, language: unknown) {
  const next = cloneQuestionStructuredContent(props.modelValue);
  const current = next[index] as QuestionCodeContentBlock;

  if (typeof language !== 'string' || !language) {
    next[index] = {
      kind: 'code',
      content: current.content,
    };
    replaceBlocks(next);
    return;
  }

  next[index] = {
    kind: 'code',
    content: current.content,
    language: language as QuestionCodeLanguage,
  };
  replaceBlocks(next);
}

function addTextBlock() {
  replaceBlocks([
    ...cloneQuestionStructuredContent(props.modelValue),
    createQuestionTextBlock(),
  ]);
}

function addCodeBlock() {
  replaceBlocks([
    ...cloneQuestionStructuredContent(props.modelValue),
    createQuestionCodeBlock(),
  ]);
}

function removeBlock(index: number) {
  const next = cloneQuestionStructuredContent(props.modelValue);
  next.splice(index, 1);
  replaceBlocks(next);
}
</script>

<template>
  <section class="structured-editor">
    <div class="structured-editor__head">
      <div class="structured-editor__copy">
        <p class="field-label">{{ label }}</p>
        <small v-if="hint">{{ hint }}</small>
        <p v-if="error" class="structured-editor__error">{{ error }}</p>
      </div>

      <div class="structured-editor__actions">
        <UiButton
          :disabled="disabled"
          size="sm"
          tone="secondary"
          @click="addTextBlock"
        >
          Добавить текст
        </UiButton>

        <UiButton
          :disabled="disabled"
          :icon="mdiCodeTags"
          size="sm"
          tone="secondary"
          @click="addCodeBlock"
        >
          Добавить код
        </UiButton>
      </div>
    </div>

    <article
      v-for="(block, index) in modelValue"
      :key="`${block.kind}-${index}`"
      class="structured-editor__block"
    >
      <div class="structured-editor__block-head">
        <p class="field-label">
          {{ block.kind === 'text' ? `Текстовый блок ${index + 1}` : `Кодовый блок ${index + 1}` }}
        </p>

        <UiButton
          :disabled="disabled"
          :icon="mdiClose"
          size="sm"
          tone="ghost"
          @click="removeBlock(index)"
        >
          Удалить
        </UiButton>
      </div>

      <template v-if="block.kind === 'text'">
        <UiField
          auto-grow
          :disabled="disabled"
          label="Текст"
          placeholder="Введите текст блока"
          rows="4"
          textarea
          :model-value="block.content"
          @update:model-value="updateTextBlock(index, $event)"
        />
      </template>

      <template v-else>
        <UiSelect
          :disabled="disabled || !block.content.trim()"
          hint="Только JS/TS/HTML/CSS/Vue-снипеты."
          :items="questionCodeLanguageOptions"
          label="Язык кода"
          :model-value="block.language ?? null"
          @update:model-value="updateCodeLanguage(index, $event)"
        />

        <div class="structured-editor__code-field">
          <label class="ui-control__label">
            <span>Код</span>
          </label>
          <QuestionCodeEditor
            :disabled="disabled"
            :language="block.language"
            :model-value="block.content"
            placeholder="Вставьте снипет"
            @update:model-value="updateCodeBlock(index, $event)"
          />
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.structured-editor,
.structured-editor__copy,
.structured-editor__actions,
.structured-editor__block,
.structured-editor__code-field {
  display: grid;
  gap: 12px;
}

.structured-editor__head,
.structured-editor__block-head {
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

.structured-editor__error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-small);
  line-height: 1.5;
}

.structured-editor__actions {
  grid-auto-flow: column;
  align-content: start;
}

.structured-editor__block {
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 88%, transparent);
  border-radius: calc(var(--panel-radius) - 10px);
  background: color-mix(in srgb, var(--color-paper) 94%, var(--color-ivory));
}

@media (max-width: 900px) {
  .structured-editor__head,
  .structured-editor__block-head {
    flex-direction: column;
  }

  .structured-editor__actions {
    grid-auto-flow: row;
  }
}
</style>
