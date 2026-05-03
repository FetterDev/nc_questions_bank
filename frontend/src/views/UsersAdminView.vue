<script setup lang="ts">
import {
  mdiAccountCheckOutline,
  mdiAccountOffOutline,
  mdiKeyVariant,
  mdiPencilOutline,
  mdiPlus,
  mdiRefresh,
} from '@mdi/js';
import { computed, reactive, ref, watch } from 'vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiIconButton from '../components/ui/UiIconButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import { pageSizeOptions } from '../features/questions/questions.constants';
import type {
  UserRecord,
  UserRoleValue,
  UserStatusValue,
} from '../features/users/users.types';
import { apiService } from '../services/api.service';
import { toUserErrorMessage } from '../features/system/error.utils';

type UserDialogMode = 'create' | 'edit';

const roleOptions: Array<{ title: string; value: 'all' | UserRoleValue }> = [
  { title: 'Все роли', value: 'all' },
  { title: 'Администратор', value: 'ADMIN' },
  { title: 'Менеджер', value: 'MANAGER' },
  { title: 'Пользователь', value: 'USER' },
] ;

const statusOptions: Array<{ title: string; value: 'all' | UserStatusValue }> = [
  { title: 'Все статусы', value: 'all' },
  { title: 'Активен', value: 'ACTIVE' },
  { title: 'Отключен', value: 'DISABLED' },
] ;

const userSearch = ref('');
const loading = ref(false);
const saving = ref(false);
const toggling = ref('');
const errorMessage = ref('');
const users = ref<UserRecord[]>([]);
const total = ref(0);
const snackbar = reactive({
  open: false,
  text: '',
  color: 'success' as 'success' | 'error',
});
const filters = reactive({
  role: 'all' as 'all' | UserRoleValue,
  status: 'all' as 'all' | UserStatusValue,
});
const pagination = reactive({
  page: 1,
  pageSize: 20,
});
const userDialog = reactive({
  open: false,
  mode: 'create' as UserDialogMode,
  userId: null as string | null,
  login: '',
  displayName: '',
  email: '',
  password: '',
  role: 'USER' as UserRoleValue,
});
const passwordDialog = reactive({
  open: false,
  userId: null as string | null,
  login: '',
  password: '',
});

let searchDebounceTimer: number | undefined;

const totalPages = computed(() => {
  const pages = Math.ceil(total.value / pagination.pageSize);
  return Math.max(1, pages || 1);
});

const visibleItemsRange = computed(() => {
  if (!total.value) {
    return '0 из 0';
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, total.value);
  return `${start}-${end} из ${total.value}`;
});

const activeUsersCount = computed(
  () => users.value.filter((item) => item.status === 'ACTIVE').length,
);

const adminUsersCount = computed(
  () => users.value.filter((item) => item.role === 'ADMIN').length,
);

const usersWithStacksCount = computed(
  () => users.value.filter((item) => item.stacks.length > 0).length,
);

const dialogTitle = computed(() =>
  userDialog.mode === 'create' ? 'Новый пользователь' : 'Редактирование пользователя',
);

const dialogSubmitLabel = computed(() =>
  userDialog.mode === 'create' ? 'Создать' : 'Сохранить',
);

function pushToast(text: string, color: 'success' | 'error' = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.open = true;
}

function openCreateDialog() {
  userDialog.open = true;
  userDialog.mode = 'create';
  userDialog.userId = null;
  userDialog.login = '';
  userDialog.displayName = '';
  userDialog.email = '';
  userDialog.password = '';
  userDialog.role = 'USER';
}

function openEditDialog(user: UserRecord) {
  userDialog.open = true;
  userDialog.mode = 'edit';
  userDialog.userId = user.id;
  userDialog.login = user.login;
  userDialog.displayName = user.displayName;
  userDialog.email = user.email ?? '';
  userDialog.password = '';
  userDialog.role = user.role;
}

function openPasswordDialog(user: UserRecord) {
  passwordDialog.open = true;
  passwordDialog.userId = user.id;
  passwordDialog.login = user.login;
  passwordDialog.password = '';
}

function normalizeOptionalEmail(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getStatusTone(status: UserStatusValue) {
  return status === 'ACTIVE' ? 'success' : 'danger';
}

function getStatusLabel(status: UserStatusValue) {
  return status === 'ACTIVE' ? 'Активен' : 'Отключен';
}

function getRoleLabel(role: UserRoleValue) {
  if (role === 'ADMIN') {
    return 'Администратор';
  }

  if (role === 'MANAGER') {
    return 'Менеджер';
  }

  return 'Пользователь';
}

function formatUserStacks(user: UserRecord) {
  if (!user.stacks.length) {
    return 'Стек не назначен';
  }

  return user.stacks.map((stack) => stack.name).join(', ');
}

async function loadUsers() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await apiService.listUsers({
      q: userSearch.value.trim() || undefined,
      role: filters.role === 'all' ? undefined : filters.role,
      status: filters.status === 'all' ? undefined : filters.status,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
    });

    users.value = response.items;
    total.value = response.total;

    if (pagination.page > totalPages.value) {
      pagination.page = totalPages.value;
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить пользователей.',
    );
  } finally {
    loading.value = false;
  }
}

async function saveUser() {
  saving.value = true;

  try {
    if (userDialog.mode === 'create') {
      await apiService.createUser({
        login: userDialog.login,
        password: userDialog.password,
        displayName: userDialog.displayName,
        email: normalizeOptionalEmail(userDialog.email) ?? undefined,
        role: userDialog.role,
      });
      pushToast('Пользователь создан.');
    } else if (userDialog.userId) {
      await apiService.updateUser(userDialog.userId, {
        displayName: userDialog.displayName,
        email: normalizeOptionalEmail(userDialog.email),
        role: userDialog.role,
      });
      pushToast('Пользователь обновлён.');
    }

    userDialog.open = false;
    await loadUsers();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось сохранить пользователя.'),
      'error',
    );
  } finally {
    saving.value = false;
  }
}

async function resetPassword() {
  if (!passwordDialog.userId) {
    return;
  }

  saving.value = true;

  try {
    await apiService.resetUserPassword(passwordDialog.userId, {
      password: passwordDialog.password,
    });
    passwordDialog.open = false;
    pushToast('Пароль сброшен.');
    await loadUsers();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось сбросить пароль.'),
      'error',
    );
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(user: UserRecord) {
  toggling.value = user.id;

  try {
    if (user.status === 'ACTIVE') {
      await apiService.deactivateUser(user.id);
      pushToast('Пользователь отключен.');
    } else {
      await apiService.activateUser(user.id);
      pushToast('Пользователь активирован.');
    }

    await loadUsers();
  } catch (error) {
    pushToast(
      toUserErrorMessage(error, 'Не удалось изменить статус пользователя.'),
      'error',
    );
  } finally {
    toggling.value = '';
  }
}

watch(
  () => userSearch.value,
  () => {
    if (searchDebounceTimer) {
      window.clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = window.setTimeout(() => {
      if (pagination.page === 1) {
        void loadUsers();
        return;
      }

      pagination.page = 1;
    }, 240);
  },
);

watch(
  () => [filters.role, filters.status, pagination.pageSize],
  () => {
    if (pagination.page === 1) {
      void loadUsers();
      return;
    }

    pagination.page = 1;
  },
);

watch(
  () => pagination.page,
  () => {
    void loadUsers();
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-frame">
    <section class="summary-strip metrics-grid">
      <article class="surface-card summary-stat">
        <span>Всего пользователей</span>
        <strong>{{ total }}</strong>
        <small>Текущая выборка по фильтрам</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Активны</span>
        <strong>{{ activeUsersCount }}</strong>
        <small>Записи на текущей странице</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Админы</span>
        <strong>{{ adminUsersCount }}</strong>
        <small>Роли ADMIN на текущей странице</small>
      </article>

      <article class="surface-card summary-stat">
        <span>Со стеком</span>
        <strong>{{ usersWithStacksCount }}</strong>
        <small>Есть назначенный стек на текущей странице</small>
      </article>
    </section>

    <UiPanel class="toolbar-panel" variant="toolbar">
      <div class="toolbar-panel__filters users-controls-card">
        <UiField
          v-model="userSearch"
          clearable
          label="Поиск пользователя"
          placeholder="login, имя или email"
        />

        <UiSelect
          v-model="filters.role"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          label="Роль"
        />

        <UiSelect
          v-model="filters.status"
          :items="statusOptions"
          item-title="title"
          item-value="value"
          label="Статус"
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
          <UiButton :icon="mdiRefresh" tone="secondary" @click="loadUsers">
            Обновить
          </UiButton>

          <UiButton :icon="mdiPlus" @click="openCreateDialog">
            Новый пользователь
          </UiButton>
        </div>
      </div>

      <v-alert v-if="errorMessage" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>
    </UiPanel>

    <UiPanel class="table-frame users-list-panel" variant="table">
      <div class="table-frame__header">
        <span class="table-card__caption">{{ visibleItemsRange }}</span>
      </div>

      <div class="table-frame__surface">
        <div v-if="loading && !users.length" class="empty-state empty-state-panel">
          <p>Загрузка</p>
        </div>

        <div v-else-if="users.length" class="users-admin-list">
          <div class="list-head list-head--users">
            <span>Пользователь</span>
            <span>Роль</span>
            <span>Стек</span>
            <span>Статус</span>
            <span>Обновлено</span>
            <span>Действия</span>
          </div>

          <article
            v-for="user in users"
            :key="user.id"
            class="list-row user-row"
          >
            <div class="user-identity-cell">
              <strong>{{ user.displayName }}</strong>
              <p>{{ user.login }}</p>
              <small>{{ user.email ?? 'Email не задан' }}</small>
            </div>

            <div class="list-cell">
              <span class="status-badge status-badge--ready">
                {{ getRoleLabel(user.role) }}
              </span>
            </div>

            <div class="list-cell user-stack-cell">
              <div v-if="user.stacks.length" class="topic-stack">
                <v-chip
                  v-for="stack in user.stacks"
                  :key="stack.id"
                  color="secondary"
                  size="small"
                  variant="tonal"
                >
                  {{ stack.name }}
                </v-chip>
              </div>
              <span v-else class="muted-inline">{{ formatUserStacks(user) }}</span>
            </div>

            <div class="list-cell">
              <span :class="['status-badge', `status-badge--${getStatusTone(user.status)}`]">
                {{ getStatusLabel(user.status) }}
              </span>
            </div>

            <div class="list-cell user-updated-cell">
              {{ new Date(user.updatedAt).toLocaleString('ru-RU') }}
            </div>

            <div class="row-actions row-actions--compact">
              <UiIconButton
                :icon="mdiPencilOutline"
                label="Редактировать пользователя"
                title="Редактировать пользователя"
                @click="openEditDialog(user)"
              />

              <UiIconButton
                :icon="mdiKeyVariant"
                label="Сбросить пароль"
                title="Сбросить пароль"
                @click="openPasswordDialog(user)"
              />

              <UiIconButton
                :disabled="toggling === user.id"
                :icon="user.status === 'ACTIVE' ? mdiAccountOffOutline : mdiAccountCheckOutline"
                :label="user.status === 'ACTIVE' ? 'Отключить пользователя' : 'Активировать пользователя'"
                :title="user.status === 'ACTIVE' ? 'Отключить пользователя' : 'Активировать пользователя'"
                @click="toggleStatus(user)"
              />
            </div>
          </article>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Пользователи не найдены</p>
          <span>Измени фильтры или создай новую учётную запись.</span>
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

    <v-dialog v-model="userDialog.open" max-width="560">
      <UiPanel class="users-dialog-card form-panel" padding="default" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ dialogTitle }}</h2>
          </div>
        </div>

        <div class="form-section">
          <UiField
            v-model="userDialog.login"
            :disabled="userDialog.mode === 'edit'"
            label="Логин"
            placeholder="nord.user"
            required
          />

          <UiField
            v-model="userDialog.displayName"
            label="Имя"
            placeholder="Nord User"
            required
          />

          <UiField
            v-model="userDialog.email"
            label="Email"
            placeholder="user@example.com"
          />

          <UiSelect
            v-model="userDialog.role"
            :items="roleOptions.slice(1)"
            item-title="title"
            item-value="value"
            label="Роль"
          />

          <UiField
            v-if="userDialog.mode === 'create'"
            v-model="userDialog.password"
            label="Пароль"
            placeholder="Минимум 12 символов"
            required
            type="password"
          />
        </div>

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="secondary" @click="userDialog.open = false">
              Отмена
            </UiButton>

            <UiButton :loading="saving" @click="saveUser">
              {{ dialogSubmitLabel }}
            </UiButton>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-dialog v-model="passwordDialog.open" max-width="520">
      <UiPanel class="users-dialog-card form-panel" padding="default" variant="form">
        <div class="panel-copy">
          <h2>Сброс пароля</h2>
          <p class="page-copy">
            Новый пароль для <strong>{{ passwordDialog.login }}</strong>.
          </p>
        </div>

        <UiField
          v-model="passwordDialog.password"
          label="Новый пароль"
          placeholder="Минимум 12 символов"
          required
          type="password"
        />

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="secondary" @click="passwordDialog.open = false">
              Отмена
            </UiButton>

            <UiButton :loading="saving" @click="resetPassword">
              Сбросить пароль
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
