<script setup lang="ts">
import { ref, watch } from 'vue';
import type { QuestionStructuredContent } from '../../features/questions/questions.types';
import {
  escapeCodeForHtml,
  formatQuestionCodeLanguage,
  renderQuestionCodeToHtml,
} from '../../features/questions/questions.highlight';

const props = withDefaults(defineProps<{
  content: QuestionStructuredContent | null;
  compact?: boolean;
  emptyLabel?: string;
}>(), {
  compact: false,
  emptyLabel: 'Пусто',
});

const highlightedCode = ref('');
let renderId = 0;

watch(
  () => [props.content?.code, props.content?.codeLanguage],
  async () => {
    const code = props.content?.code?.trim() ? props.content.code : '';

    if (!code) {
      highlightedCode.value = '';
      return;
    }

    const currentRenderId = ++renderId;

    try {
      const html = await renderQuestionCodeToHtml(code, props.content?.codeLanguage);

      if (currentRenderId !== renderId) {
        return;
      }

      highlightedCode.value = html;
    } catch {
      if (currentRenderId !== renderId) {
        return;
      }

      highlightedCode.value = `<pre class="shiki"><code>${escapeCodeForHtml(code)}</code></pre>`;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    :class="[
      'question-content-renderer',
      { 'question-content-renderer--compact': compact },
    ]"
  >
    <template v-if="content?.text?.trim()">
      <p class="question-content-renderer__text">
        {{ content.text }}
      </p>

      <div v-if="content.code?.trim()" class="question-content-renderer__code">
        <span class="question-content-renderer__language">
          {{ formatQuestionCodeLanguage(content.codeLanguage) }}
        </span>
        <div
          class="question-content-renderer__code-body"
          v-html="highlightedCode"
        />
      </div>
    </template>

    <p v-else class="question-content-renderer__empty">
      {{ emptyLabel }}
    </p>
  </div>
</template>

<style scoped>
.question-content-renderer {
  display: grid;
  gap: 12px;
  --question-content-text-color: var(--color-ink);
  --question-content-muted-color: var(--color-ink-muted);
  --question-content-code-border: color-mix(in srgb, var(--panel-border) 88%, var(--color-paper));
  --question-content-code-bg: color-mix(in srgb, var(--color-paper) 92%, var(--color-ivory));
  --question-content-code-color: var(--color-ink);
}

.question-content-renderer--compact {
  gap: 8px;
}

.question-content-renderer__text,
.question-content-renderer__empty {
  margin: 0;
  color: var(--question-content-text-color);
  font-family: var(--question-content-text-font, var(--font-body));
  font-size: var(--question-content-text-size, 1rem);
  white-space: pre-wrap;
  line-height: var(--question-content-text-line-height, 1.55);
  letter-spacing: var(--question-content-text-letter-spacing, normal);
}

.question-content-renderer__empty {
  color: var(--question-content-muted-color);
}

.question-content-renderer__code {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--question-content-code-border);
  border-radius: calc(var(--panel-radius) - 10px);
  background: var(--question-content-code-bg);
}

.question-content-renderer__language {
  color: var(--question-content-muted-color);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.question-content-renderer__code-body {
  overflow-x: auto;
}

.question-content-renderer__code-body :deep(pre.shiki) {
  margin: 0;
  min-width: 100%;
  background: transparent !important;
  color: var(--question-content-code-color) !important;
  font-family: var(--font-mono) !important;
  font-size: var(--question-content-code-size, 0.92rem) !important;
  line-height: var(--question-content-code-line-height, 1.6) !important;
}

.question-content-renderer__code-body :deep(code) {
  counter-reset: line;
  display: grid;
}

.question-content-renderer__code-body :deep(.line) {
  position: relative;
  display: block;
  min-height: 1.6em;
  padding-left: 4rem;
  white-space: pre;
}

.question-content-renderer__code-body :deep(.line::before) {
  content: counter(line);
  counter-increment: line;
  position: absolute;
  top: 0;
  left: 0;
  width: 2.8rem;
  padding-right: 0.75rem;
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  color: var(--question-content-muted-color);
  text-align: right;
  user-select: none;
}

.question-content-renderer__code-body :deep(.line:empty::after) {
  content: ' ';
}

.question-content-renderer--compact .question-content-renderer__text,
.question-content-renderer--compact .question-content-renderer__empty {
  font-size: var(--question-content-compact-text-size, var(--font-size-small));
}

.question-content-renderer--compact .question-content-renderer__code {
  gap: 6px;
  padding: 10px;
}

.question-content-renderer--compact .question-content-renderer__code-body {
  max-height: 10rem;
}

.question-content-renderer--compact .question-content-renderer__code-body :deep(pre.shiki) {
  font-size: var(--question-content-compact-code-size, 0.85rem) !important;
}

.question-content-renderer--compact .question-content-renderer__code-body :deep(.line) {
  padding-left: 3.5rem;
}

.question-content-renderer--compact .question-content-renderer__code-body :deep(.line::before) {
  width: 2.3rem;
  padding-right: 0.6rem;
}
</style>
