<script setup lang="ts">
import { computed } from 'vue';
import UiAutocomplete from '../ui/UiAutocomplete.vue';
import UiButton from '../ui/UiButton.vue';
import UiField from '../ui/UiField.vue';
import UiPanel from '../ui/UiPanel.vue';
import UiSelect from '../ui/UiSelect.vue';
import QuestionContentBlockEditor from './QuestionContentBlockEditor.vue';
import QuestionContentRenderer from './QuestionContentRenderer.vue';
import { criterionWeightOptions } from '../../features/questions/questions.constants';
import type {
  DifficultyOption,
  EditorMode,
  QuestionFormValues,
} from '../../features/questions/questions.types';
import type { Company } from '../../features/companies/companies.types';
import type { Competency } from '../../features/competencies/competencies.types';
import type { Topic } from '../../features/topics/topics.types';

const props = withDefaults(defineProps<{
  answerContentError?: string;
  cancelLabel: string;
  companiesLoading: boolean;
  companyOptions: Company[];
  competenciesError?: string;
  competenciesLoading?: boolean;
  competencyOptions?: Competency[];
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
}>(), {
  competenciesError: '',
  competenciesLoading: false,
  competencyOptions: () => [],
});

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'submit'): void;
}>();

const selectedCompetencyOptions = computed(() => {
  const selectedIds = new Set(props.form.competencyIds);
  return props.competencyOptions.filter((item) => selectedIds.has(item.id));
});

function addCriterion() {
  props.form.evaluationCriteria.push({
    title: '',
    description: '',
    competencyId: props.form.competencyIds[0] ?? null,
    weight: 1,
  });
}

function removeCriterion(index: number) {
  props.form.evaluationCriteria.splice(index, 1);
}
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
        <p class="section-label">Компетенции и критерии</p>

        <UiAutocomplete
          v-model="props.form.competencyIds"
          :disabled="disabled"
          :items="competencyOptions"
          :loading="competenciesLoading"
          chips
          clearable
          closable-chips
          item-title="name"
          item-value="id"
          label="Компетенции"
          multiple
          placeholder="Выберите компетенции вопроса"
        />

        <div class="criteria-editor">
          <article
            v-for="(criterion, index) in props.form.evaluationCriteria"
            :key="index"
            class="criteria-editor__row"
          >
            <div class="criteria-editor__main">
              <UiField
                v-model="criterion.title"
                :disabled="disabled"
                hide-label
                label="Критерий"
                placeholder="Критерий оценки"
              />

              <UiAutocomplete
                v-model="criterion.competencyId"
                :disabled="disabled || selectedCompetencyOptions.length === 0"
                :items="selectedCompetencyOptions"
                clearable
                hide-label
                item-title="name"
                item-value="id"
                label="Компетенция критерия"
                placeholder="Компетенция"
              />

              <UiSelect
                v-model="criterion.weight"
                :disabled="disabled"
                :items="criterionWeightOptions"
                hide-label
                item-title="title"
                item-value="value"
                label="Вес"
              />
            </div>

            <UiField
              v-model="criterion.description"
              :disabled="disabled"
              hide-label
              label="Описание"
              placeholder="Описание критерия"
              textarea
            />

            <div class="action-footer action-footer--end">
              <UiButton tone="text" @click="removeCriterion(index)">
                Удалить
              </UiButton>
            </div>
          </article>

          <v-alert v-if="competenciesError" type="error" variant="tonal">
            {{ competenciesError }}
          </v-alert>

          <UiButton tone="secondary" @click="addCriterion">
            Добавить критерий
          </UiButton>
        </div>
      </section>

      <section class="form-section">
        <p class="section-label">Предпросмотр</p>

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
