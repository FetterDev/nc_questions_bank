<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { mdiPencilOutline, mdiPlus, mdiRefresh } from '@mdi/js';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import type { Company } from '../features/companies/companies.types';
import { pageSizeOptions } from '../features/questions/questions.constants';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

type DialogMode = 'create' | 'edit';

const searchQuery = ref('');
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const companies = ref<Company[]>([]);
const total = ref(0);
const snackbar = reactive({ open: false, text: '', color: 'success' as 'success' | 'error' });
const pagination = reactive({ page: 1, pageSize: 20 });
const dialog = reactive({
  open: false,
  mode: 'create' as DialogMode,
  companyId: null as string | null,
  name: '',
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1));
const visibleItemsRange = computed(() => {
  if (!total.value) return '0 из 0';
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, total.value);
  return `${start}-${end} из ${total.value}`;
});
const dialogTitle = computed(() => dialog.mode === 'create' ? 'Новая компания' : 'Переименование компании');
const dialogSubmitLabel = computed(() => dialog.mode === 'create' ? 'Создать' : 'Сохранить');
const linkedCompaniesCount = computed(() => companies.value.filter((company) => company.questionsCount > 0).length);
const requiredNameRule = (value?: string) => Boolean(value?.trim()) || 'Название обязательно';

let searchDebounceTimer: number | undefined;

function openCreateDialog() {
  dialog.open = true;
  dialog.mode = 'create';
  dialog.companyId = null;
  dialog.name = '';
}

function openEditDialog(company: Company) {
  dialog.open = true;
  dialog.mode = 'edit';
  dialog.companyId = company.id;
  dialog.name = company.name;
}

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

async function loadCompanies() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiService.listCompanies({
      q: searchQuery.value.trim() || undefined,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });
    companies.value = response.items;
    total.value = response.total;
    if (pagination.page > totalPages.value) pagination.page = totalPages.value;
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось загрузить справочник компаний.');
  } finally {
    loading.value = false;
  }
}

async function saveCompany() {
  const name = dialog.name.trim();
  if (!name) return;
  saving.value = true;
  try {
    if (dialog.mode === 'create') {
      await apiService.createCompany({ name });
      pushToast('Компания создана.');
    } else if (dialog.companyId) {
      await apiService.updateCompany(dialog.companyId, { name });
      pushToast('Компания обновлена.');
    }
    dialog.open = false;
    await loadCompanies();
  } catch (error) {
    pushToast(toUserErrorMessage(error, 'Не удалось сохранить компанию.'), 'error');
  } finally {
    saving.value = false;
  }
}

watch(() => searchQuery.value, () => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    if (pagination.page === 1) {
      void loadCompanies();
      return;
    }
    pagination.page = 1;
  }, 240);
});

watch(() => pagination.pageSize, () => {
  if (pagination.page === 1) {
    void loadCompanies();
    return;
  }
  pagination.page = 1;
});

watch(() => pagination.page, () => {
  void loadCompanies();
}, { immediate: true });
</script>

<template>
  <section class="page-frame">
    <section class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Всего компаний</span>
        <strong>{{ total }}</strong>
        <small>Справочник для банка вопросов</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Диапазон</span>
        <strong>{{ visibleItemsRange }}</strong>
        <small>Страница {{ pagination.page }} / {{ totalPages }}</small>
      </article>

      <article class="surface-card summary-stat">
        <span>В выборке</span>
        <strong>{{ linkedCompaniesCount }}</strong>
        <small>Компании с привязанными вопросами на текущей странице</small>
      </article>
    </section>

    <UiPanel class="toolbar-panel" variant="toolbar">
      <div class="toolbar-panel__filters topics-controls-card">
        <UiField
          v-model="searchQuery"
          clearable
          label="Поиск компании"
          placeholder="Название компании"
        />

        <UiSelect
          v-model="pagination.pageSize"
          :items="pageSizeOptions"
          item-title="title"
          item-value="value"
          label="Строк на страницу"
        />
      </div>

      <div class="action-footer action-footer--end">
        <div class="action-footer__group">
          <UiButton :icon="mdiRefresh" tone="secondary" @click="loadCompanies">
            Обновить
          </UiButton>

          <UiButton :icon="mdiPlus" @click="openCreateDialog">
            Новая компания
          </UiButton>
        </div>
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>
    </UiPanel>

    <UiPanel class="table-frame topics-list-panel" variant="table">
      <div class="table-frame__header">
        <span class="table-card__caption">{{ visibleItemsRange }}</span>
      </div>

      <div class="table-frame__surface">
        <div v-if="loading && !companies.length" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="companies.length" class="topic-admin-list">
          <div class="list-head list-head--topics">
            <span>Компания</span>
            <span>Вопросов</span>
            <span>Действия</span>
          </div>

          <article
            v-for="company in companies"
            :key="company.id"
            class="list-row list-row--topics"
          >
            <div class="list-cell">
              <div class="topic-cell">
                <strong>{{ company.name }}</strong>
                <small>{{ company.id }}</small>
              </div>
            </div>

            <div class="list-cell">
              <span class="status-badge status-badge--ready">
                {{ company.questionsCount }}
              </span>
            </div>

            <div class="row-actions row-actions--compact">
              <UiIconButton
                :icon="mdiPencilOutline"
                label="Переименовать компанию"
                title="Переименовать компанию"
                @click="openEditDialog(company)"
              />
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Компании не найдены</p>
          <span>Измени фильтр или добавь первую запись.</span>
        </div>
      </div>

      <div class="action-footer">
        <span>{{ visibleItemsRange }}</span>

        <v-pagination
          v-model="pagination.page"
          :length="totalPages"
          :total-visible="5"
          color="primary"
        />
      </div>
    </UiPanel>

    <v-dialog v-model="dialog.open" max-width="560">
      <UiPanel class="form-panel" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ dialogTitle }}</h2>
          </div>
        </div>

        <section class="form-section">
          <UiField
            v-model="dialog.name"
            :rules="[requiredNameRule]"
            autofocus
            label="Название"
            placeholder="Например, Google"
            required
          />
        </section>

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="secondary" @click="dialog.open = false">
              Отмена
            </UiButton>

            <UiButton :loading="saving" @click="saveCompany">
              {{ dialogSubmitLabel }}
            </UiButton>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>
