<script setup lang="ts">
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiCalendarPlus,
  mdiPlus,
  mdiRefresh,
  mdiTrashCanOutline,
  mdiPencilOutline,
} from '@mdi/js';
import { computed, reactive, ref, watch } from 'vue';
import InterviewMonthCalendar from '../components/interviews/InterviewMonthCalendar.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiSelect from '../components/ui/UiSelect.vue';
import UiAutocomplete from '../components/ui/UiAutocomplete.vue';
import type {
  AdminInterviewCalendar,
  CreateInterviewCyclePayload,
  InterviewItem,
} from '../features/interviews/interviews.types';
import {
  formatDateOnly,
  formatInterviewStatus,
  getCurrentMonth,
  interviewPartnerLabel,
  shiftMonth,
} from '../features/interviews/interviews.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

type UserOption = {
  id: string;
  title: string;
};

type PresetOption = {
  id: string;
  title: string;
};

const month = ref(getCurrentMonth());
const calendar = ref<AdminInterviewCalendar | null>(null);
const loading = ref(false);
const saving = ref(false);
const deletingId = ref('');
const errorMessage = ref('');
const userOptions = ref<UserOption[]>([]);
const presetOptions = ref<PresetOption[]>([]);
const dayDialog = reactive({
  open: false,
  date: '',
});
const cycleDialog = reactive<{
  open: boolean;
  periodStart: string;
  periodEnd: string;
  participantIds: string[];
}>({
  open: false,
  periodStart: '',
  periodEnd: '',
  participantIds: [],
});
const pairDialog = reactive<{
  open: boolean;
  interviewId: string | null;
  interviewerId: string | null;
  intervieweeId: string | null;
  plannedDate: string | null;
  presetId: string | null;
}>({
  open: false,
  interviewId: null,
  interviewerId: null,
  intervieweeId: null,
  plannedDate: null,
  presetId: null,
});

const activeCycle = computed(() => calendar.value?.activeCycle ?? null);
const draftItems = computed(() =>
  activeCycle.value?.interviews.filter((item) => item.status === 'DRAFT') ?? [],
);
const monthItems = computed(() => calendar.value?.items ?? []);
const assignedItems = computed(() => monthItems.value);
const dayItems = computed(() =>
  monthItems.value.filter((item) => item.plannedDate === dayDialog.date),
);
const canCreatePairForSelectedDay = computed(() => {
  if (!activeCycle.value || !dayDialog.date) {
    return false;
  }

  return (
    dayDialog.date >= activeCycle.value.periodStart &&
    dayDialog.date <= activeCycle.value.periodEnd
  );
});
const monthSummary = computed(() => ({
  draftCount: draftItems.value.length,
  plannedCount: monthItems.value.filter((item) => item.status === 'PLANNED').length,
  scheduledCount: monthItems.value.filter((item) => item.status === 'SCHEDULED').length,
  completedCount: monthItems.value.filter((item) => item.status === 'COMPLETED').length,
}));
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month.value}-01T00:00:00.000Z`)),
);

function currentWeekBounds() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(utc.getTime() + diff * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

async function loadCalendar() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const [calendarResponse, usersResponse, presets] = await Promise.all([
      apiService.getAdminInterviewCalendar({ month: month.value }),
      apiService.listUsers({
        role: 'USER',
        status: 'ACTIVE',
        limit: 100,
        offset: 0,
      }),
      apiService.listTrainingPresets(),
    ]);

    calendar.value = calendarResponse;
    userOptions.value = usersResponse.items
      .map((item) => ({
        id: item.id,
        title: item.displayName,
      }))
      .sort((left, right) => left.title.localeCompare(right.title, 'ru-RU'));
    presetOptions.value = presets.map((item) => ({
      id: item.id,
      title: item.name,
    }));
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить интервью.',
    );
  } finally {
    loading.value = false;
  }
}

function openCycleDialog() {
  const bounds = currentWeekBounds();
  cycleDialog.open = true;
  cycleDialog.periodStart = bounds.periodStart;
  cycleDialog.periodEnd = bounds.periodEnd;
  cycleDialog.participantIds = [];
}

function openManualPairDialog(plannedDate: string | null = null) {
  pairDialog.open = true;
  pairDialog.interviewId = null;
  pairDialog.interviewerId = null;
  pairDialog.intervieweeId = null;
  pairDialog.plannedDate = plannedDate;
  pairDialog.presetId = null;
}

function openManualPairDialogFromDay() {
  if (!canCreatePairForSelectedDay.value) {
    return;
  }

  dayDialog.open = false;
  openManualPairDialog(dayDialog.date);
}

function openEditPairDialog(item: InterviewItem) {
  pairDialog.open = true;
  pairDialog.interviewId = item.id;
  pairDialog.interviewerId = item.interviewer.id;
  pairDialog.intervieweeId = item.interviewee.id;
  pairDialog.plannedDate = item.plannedDate;
  pairDialog.presetId = item.preset?.id ?? null;
}

function openDay(date: string) {
  dayDialog.open = true;
  dayDialog.date = date;
}

async function createCycle() {
  saving.value = true;

  try {
    const payload: CreateInterviewCyclePayload = {
      periodStart: cycleDialog.periodStart,
      periodEnd: cycleDialog.periodEnd,
      participantIds: cycleDialog.participantIds,
    };
    const created = await apiService.createInterviewCycle(payload);

    cycleDialog.open = false;
    month.value = created.periodStart.slice(0, 7);
    await loadCalendar();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось создать weekly cycle.',
    );
  } finally {
    saving.value = false;
  }
}

async function savePair() {
  if (!activeCycle.value && !pairDialog.interviewId) {
    return;
  }

  if (!pairDialog.interviewerId || !pairDialog.intervieweeId) {
    errorMessage.value = 'Нужно выбрать interviewer и interviewee.';
    return;
  }

  saving.value = true;

  try {
    let interviewId = pairDialog.interviewId;

    if (!interviewId) {
      const created = await apiService.createInterviewPair(activeCycle.value!.id, {
        interviewerId: pairDialog.interviewerId,
        intervieweeId: pairDialog.intervieweeId,
      });
      interviewId = created.id;
    }

    await apiService.updateInterview(interviewId, {
      interviewerId: pairDialog.interviewerId,
      intervieweeId: pairDialog.intervieweeId,
      plannedDate: pairDialog.plannedDate || null,
      presetId: pairDialog.presetId || null,
    });

    pairDialog.open = false;
    await loadCalendar();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось сохранить пару.',
    );
  } finally {
    saving.value = false;
  }
}

async function removePair(id: string) {
  deletingId.value = id;

  try {
    await apiService.deleteInterview(id);
    await loadCalendar();
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось удалить интервью.',
    );
  } finally {
    deletingId.value = '';
  }
}

watch(month, () => {
  void loadCalendar();
}, { immediate: true });
</script>

<template>
  <section class="page-frame">
    <div class="summary-strip metrics-grid metrics-grid--four">
      <article class="surface-card summary-stat">
        <span>Месяц</span>
        <strong>{{ monthLabel }}</strong>
        <small>Календарный режим</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Draft</span>
        <strong>{{ monthSummary.draftCount }}</strong>
        <small>Без даты в active cycle</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Scheduled</span>
        <strong>{{ monthSummary.scheduledCount }}</strong>
        <small>Готовы к проведению</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Completed</span>
        <strong>{{ monthSummary.completedCount }}</strong>
        <small>Закрыты в текущем месяце</small>
      </article>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <UiPanel class="toolbar-panel" variant="toolbar">
      <div class="interview-toolbar">
        <div class="interview-toolbar__nav">
          <UiButton :icon="mdiArrowLeft" tone="text" @click="month = shiftMonth(month, -1)">
            Назад
          </UiButton>
          <strong>{{ monthLabel }}</strong>
          <UiButton :icon="mdiArrowRight" tone="text" @click="month = shiftMonth(month, 1)">
            Вперёд
          </UiButton>
        </div>

        <div class="action-footer__group">
          <UiButton :icon="mdiRefresh" tone="text" @click="loadCalendar">
            Обновить
          </UiButton>
          <UiButton :icon="mdiCalendarPlus" @click="openCycleDialog">
            Новый cycle
          </UiButton>
          <UiButton :icon="mdiPlus" tone="secondary" :disabled="!activeCycle" @click="openManualPairDialog">
            Ручная пара
          </UiButton>
        </div>
      </div>
    </UiPanel>

    <div class="interviews-admin-stack">
      <UiPanel class="detail-panel interviews-cycle-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Черновики текущего цикла</h2>
            <small v-if="activeCycle">
              {{ formatDateOnly(activeCycle.periodStart) }} - {{ formatDateOnly(activeCycle.periodEnd) }}
            </small>
          </div>
        </div>

        <div v-if="draftItems.length" class="interview-draft-list">
          <article
            v-for="item in draftItems"
            :key="item.id"
            class="interview-draft-card interview-record-card"
          >
            <div class="interview-draft-card__copy">
              <strong>{{ interviewPartnerLabel(item) }}</strong>
              <small>Дата и пресет ещё не выбраны</small>
            </div>
            <div class="interview-draft-card__meta">
              <span class="interview-status-pill interview-status-pill--draft">
                <span class="interview-status-pill__dot" />
                {{ formatInterviewStatus(item.status) }}
              </span>
            </div>
            <div class="interview-draft-card__actions">
              <UiButton :icon="mdiPencilOutline" size="sm" tone="text" @click="openEditPairDialog(item)">
                Настроить
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>{{ loading ? 'Загрузка' : 'Draft-пар нет' }}</p>
          <span>Создай weekly cycle или добавь пару вручную.</span>
        </div>
      </UiPanel>

      <UiPanel class="detail-panel interviews-list-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Запланированные собеседования</h2>
          </div>
          <span class="table-card__caption">{{ assignedItems.length }} записей с датой</span>
        </div>

        <div v-if="assignedItems.length" class="interview-row-list">
          <article
            v-for="item in assignedItems"
            :key="item.id"
            class="interview-row-card interview-record-card"
          >
            <div class="interview-row-card__copy">
              <strong>{{ interviewPartnerLabel(item) }}</strong>
              <small>{{ formatDateOnly(item.plannedDate) }} · {{ item.preset?.name ?? 'без пресета' }}</small>
            </div>
            <div class="interview-row-card__meta">
              <span
                class="interview-status-pill"
                :class="`interview-status-pill--${item.status.toLowerCase()}`"
              >
                <span class="interview-status-pill__dot" />
                {{ formatInterviewStatus(item.status) }}
              </span>
            </div>
            <div class="interview-row-card__actions">
              <UiButton :icon="mdiPencilOutline" size="sm" tone="text" @click="openEditPairDialog(item)">
                Править
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>{{ loading ? 'Загрузка' : 'На месяц пока нет записей' }}</p>
        </div>
      </UiPanel>

      <UiPanel class="detail-panel interviews-calendar-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Календарь собеседований</h2>
          </div>
          <div class="interview-calendar__legend">
            <span class="interview-status-pill interview-status-pill--planned">
              <span class="interview-status-pill__dot" />
              planned
            </span>
            <span class="interview-status-pill interview-status-pill--scheduled">
              <span class="interview-status-pill__dot" />
              scheduled
            </span>
            <span class="interview-status-pill interview-status-pill--completed">
              <span class="interview-status-pill__dot" />
              completed
            </span>
          </div>
        </div>

        <InterviewMonthCalendar
          v-if="calendar"
          :days="calendar.days.map((item) => item.date)"
          :items="monthItems"
          @select-day="openDay"
        />
      </UiPanel>
    </div>

    <v-dialog v-model="cycleDialog.open" max-width="760">
      <UiPanel class="form-panel" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Новый weekly cycle</h2>
          </div>
        </div>

        <div class="form-section interviews-form-grid">
          <UiField v-model="cycleDialog.periodStart" label="Начало недели" type="date" />
          <UiField v-model="cycleDialog.periodEnd" label="Конец недели" type="date" />
        </div>

        <UiAutocomplete
          v-model="cycleDialog.participantIds"
          :items="userOptions"
          item-title="title"
          item-value="id"
          label="Участники"
          multiple
        />

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="text" @click="cycleDialog.open = false">Отмена</UiButton>
            <UiButton :loading="saving" @click="createCycle">Сгенерировать</UiButton>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-dialog v-model="pairDialog.open" max-width="760">
      <UiPanel class="form-panel" variant="form">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ pairDialog.interviewId ? 'Редактирование интервью' : 'Новая пара' }}</h2>
          </div>
        </div>

        <div class="form-section interviews-form-grid">
          <UiSelect
            v-model="pairDialog.interviewerId"
            :items="userOptions"
            item-title="title"
            item-value="id"
            label="Interviewer"
          />
          <UiSelect
            v-model="pairDialog.intervieweeId"
            :items="userOptions"
            item-title="title"
            item-value="id"
            label="Interviewee"
          />
        </div>

        <div class="form-section interviews-form-grid">
          <UiField
            v-model="pairDialog.plannedDate"
            label="Дата"
            type="date"
          />
          <UiSelect
            v-model="pairDialog.presetId"
            :items="presetOptions"
            item-title="title"
            item-value="id"
            label="Пресет"
          />
        </div>

        <div class="action-footer action-footer--end">
          <div class="action-footer__group">
            <UiButton tone="text" @click="pairDialog.open = false">Отмена</UiButton>
            <UiButton :loading="saving" @click="savePair">Сохранить</UiButton>
          </div>
        </div>
      </UiPanel>
    </v-dialog>

    <v-dialog v-model="dayDialog.open" max-width="860">
      <UiPanel class="detail-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ formatDateOnly(dayDialog.date || null) }}</h2>
          </div>
          <UiButton
            :icon="mdiPlus"
            size="sm"
            tone="secondary"
            :disabled="!canCreatePairForSelectedDay"
            @click="openManualPairDialogFromDay"
          >
            Создать пару
          </UiButton>
        </div>

        <div v-if="dayItems.length" class="interview-row-list">
          <article
            v-for="item in dayItems"
            :key="item.id"
            class="interview-row-card interview-row-card--stacked"
          >
            <div class="interview-row-card__copy">
              <strong>{{ interviewPartnerLabel(item) }}</strong>
              <small>{{ item.preset?.name ?? 'без пресета' }}</small>
            </div>
            <div class="interview-row-card__meta interview-row-card__meta--wrap">
              <span
                class="interview-status-pill"
                :class="`interview-status-pill--${item.status.toLowerCase()}`"
              >
                <span class="interview-status-pill__dot" />
                {{ formatInterviewStatus(item.status) }}
              </span>
              <UiButton :icon="mdiPencilOutline" size="sm" tone="text" @click="openEditPairDialog(item)">
                Править
              </UiButton>
              <UiButton
                v-if="item.status !== 'COMPLETED'"
                :icon="mdiTrashCanOutline"
                size="sm"
                tone="text"
                :loading="deletingId === item.id"
                @click="removePair(item.id)"
              >
                Удалить
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>На этот день записей нет</p>
          <span v-if="!canCreatePairForSelectedDay">
            Для ручного создания нужен активный cycle, включающий эту дату.
          </span>
        </div>
      </UiPanel>
    </v-dialog>
  </section>
</template>
