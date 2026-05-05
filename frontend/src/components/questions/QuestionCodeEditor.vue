<script setup lang="ts">
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { QuestionCodeLanguage } from '../../features/questions/questions.types';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  language?: QuestionCodeLanguage;
  modelValue: string;
  placeholder?: string;
}>(), {
  disabled: false,
  language: undefined,
  placeholder: '',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const root = ref<HTMLDivElement | null>(null);
const languageCompartment = new Compartment();
const editableCompartment = new Compartment();
const readOnlyCompartment = new Compartment();
const placeholderCompartment = new Compartment();
let editorView: EditorView | null = null;
let skipSync = false;

const resolvedLanguage = computed<QuestionCodeLanguage>(() => props.language ?? 'typescript');

function createLanguageExtension(language: QuestionCodeLanguage): Extension {
  if (
    language === 'javascript' ||
    language === 'jsx' ||
    language === 'typescript' ||
    language === 'tsx'
  ) {
    return javascript({
      jsx: language === 'jsx' || language === 'tsx',
      typescript: language === 'typescript' || language === 'tsx',
    });
  }

  return [];
}

function createEditorTheme() {
  return EditorView.theme({
    '&': {
      minHeight: '15rem',
      border: '1px solid var(--panel-border)',
      borderRadius: 'var(--panel-radius)',
      backgroundColor: 'var(--color-surface-muted)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.95rem',
      lineHeight: '1.6',
      overflow: 'hidden',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '15rem',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: 'var(--color-ink)',
    },
    '.cm-gutters': {
      border: 'none',
      borderRight: '1px solid var(--color-border-muted)',
      backgroundColor: 'var(--table-header-bg)',
      color: 'var(--color-ink-muted)',
      minWidth: '3rem',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 12px 0 16px',
      fontFamily: 'inherit',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--color-info-soft)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-info-soft)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-focus-ring)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--color-focus-ring)',
      outlineOffset: '0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--color-cyan)',
    },
    '.cm-placeholder': {
      color: 'var(--color-ink-muted)',
      fontStyle: 'italic',
    },
    '.cm-panels': {
      backgroundColor: 'var(--color-surface-primary)',
      color: 'var(--color-ink)',
    },
  });
}

function syncValueFromEditor(value: string) {
  skipSync = true;
  emit('update:modelValue', value);
  queueMicrotask(() => {
    skipSync = false;
  });
}

function createEditor() {
  if (!root.value) {
    return;
  }

  editorView = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        createEditorTheme(),
        languageCompartment.of(createLanguageExtension(resolvedLanguage.value)),
        editableCompartment.of(EditorView.editable.of(!props.disabled)),
        readOnlyCompartment.of(EditorState.readOnly.of(props.disabled)),
        placeholderCompartment.of(placeholder(props.placeholder)),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return;
          }

          syncValueFromEditor(update.state.doc.toString());
        }),
      ],
    }),
    parent: root.value,
  });
}

onMounted(() => {
  createEditor();
});

onUnmounted(() => {
  editorView?.destroy();
  editorView = null;
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editorView || skipSync) {
      return;
    }

    const current = editorView.state.doc.toString();

    if (current === value) {
      return;
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value,
      },
    });
  },
);

watch(
  () => resolvedLanguage.value,
  (language) => {
    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: languageCompartment.reconfigure(createLanguageExtension(language)),
    });
  },
);

watch(
  () => props.disabled,
  (disabled) => {
    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: [
        editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
        readOnlyCompartment.reconfigure(EditorState.readOnly.of(disabled)),
      ],
    });
  },
);

watch(
  () => props.placeholder,
  (nextPlaceholder) => {
    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: placeholderCompartment.reconfigure(placeholder(nextPlaceholder)),
    });
  },
);
</script>

<template>
  <div ref="root" class="question-code-editor" />
</template>

<style scoped>
.question-code-editor {
  display: block;
}
</style>
