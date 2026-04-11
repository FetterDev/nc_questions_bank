<script setup lang="ts">
import UiAutocomplete from '../ui/UiAutocomplete.vue';
import UiButton from '../ui/UiButton.vue';
import UiPanel from '../ui/UiPanel.vue';
import QuestionContentBlockEditor from './QuestionContentBlockEditor.vue';
import QuestionContentRenderer from './QuestionContentRenderer.vue';
import type {
  DifficultyOption,
  EditorMode,
  QuestionFormValues,
} from '../../features/questions/questions.types';
import type { Company } from '../../features/companies/companies.types';
import type { Topic } from '../../features/topics/topics.types';

const props = defineProps<{
  answerContentError?: string;
  cancelLabel: string;
  companiesLoading: boolean;
  companyOptions: Company[];
  difficultyOptions: DifficultyOption[];
  disabled: boolean;
  form: QuestionFormValues;
  mode: EditorMode;
  questionContentError?: string;
  saving: boolean;
  submitLabel: string;
  title: string;
  topicOptions: Topic[];
  topicsError?: string;
  topicsLoading: boolean;
}>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit'): void;
}>();
</script>

<template>
  <UiPanel class="form-panel editor-panel" variant="form">
    <div class="panel-header">
      <div class="panel-copy">
        <h2>{{ title }}</h2>
      </div>

      <v-chip color="secondary" rounded="pill" variant="tonal">
        {{ mode === 'create' ? 'Создание' : 'Редактирование' }}
      </v-chip>
    </div>

    <div class="editor-form">
      <section class="form-section">
        <QuestionContentBlockEditor
          v-model="props.form.textContent"
          :disabled="disabled"
          :error="questionContentError"
          hint="Текст обязателен. Код можно добавить отдельным снипетом."
          label="Вопрос"
        />
      </section>

      <section class="form-section">
        <QuestionContentBlockEditor
          v-model="props.form.answerContent"
          :disabled="disabled"
          :error="answerContentError"
          hint="Ответ поддерживает тот же формат, что и вопрос."
          label="Ответ"
        />
      </section>

      <section class="form-section">
        <p class="section-label">Сложность и темы</p>

        <div class="form-row">
          <div>
            <p class="field-label">Сложность</p>
            <div class="difficulty-toggle" role="radiogroup" aria-label="Сложность">
              <UiButton
                v-for="option in difficultyOptions"
                :key="option.value"
                :aria-checked="props.form.difficulty === option.value"
                :class="[
                  'difficulty-toggle__option',
                  { 'difficulty-toggle__option--active': props.form.difficulty === option.value },
                ]"
                :disabled="disabled"
                :tone="props.form.difficulty === option.value ? 'primary' : 'ghost'"
                @click="props.form.difficulty = option.value"
              >
                {{ option.title }}
              </UiButton>
            </div>
          </div>

          <UiAutocomplete
            v-model="props.form.companyId"
            :disabled="disabled"
            :items="companyOptions"
            :loading="companiesLoading"
            clearable
            hide-label
            item-title="name"
            item-value="id"
            label="Компания"
            no-data-text="Компании не найдены"
            placeholder="Если вопрос встречался в компании"
          />

          <UiAutocomplete
            v-model="props.form.topicIds"
            :disabled="disabled"
            :error="topicsError"
            :items="topicOptions"
            :loading="topicsLoading"
            chips
            clearable
            closable-chips
            hide-label
            item-title="name"
            item-value="id"
            label="Темы"
            multiple
            placeholder="Выберите темы"
            required
          />
        </div>
      </section>

      <section class="form-section">
        <p class="section-label">Live preview</p>

        <div class="editor-preview-grid">
          <article class="editor-preview-card">
            <span class="editor-preview-card__label">Вопрос</span>
            <QuestionContentRenderer
              :content="props.form.textContent"
              empty-label="Добавьте текст вопроса"
            />
          </article>

          <article class="editor-preview-card">
            <span class="editor-preview-card__label">Ответ</span>
            <QuestionContentRenderer
              :content="props.form.answerContent"
              empty-label="Добавьте текст ответа"
            />
          </article>
        </div>
      </section>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton tone="secondary" @click="emit('cancel')">
            {{ cancelLabel }}
          </UiButton>

          <UiButton :loading="saving" @click="emit('submit')">
            {{ submitLabel }}
          </UiButton>
        </div>
      </div>
    </div>
  </UiPanel>
</template>
