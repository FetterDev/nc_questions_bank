<script setup lang="ts">
import { mdiArrowLeft, mdiArrowRight, mdiPlayOutline } from '@mdi/js';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import InterviewMonthCalendar from '../components/interviews/InterviewMonthCalendar.vue';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import type { MyInterviewCalendar } from '../features/interviews/interviews.types';
import {
  formatDateOnly,
  formatInterviewRole,
  formatInterviewStatus,
  getCurrentMonth,
  interviewPartnerLabel,
  interviewStatusColor,
  shiftMonth,
} from '../features/interviews/interviews.utils';
import { toUserErrorMessage } from '../features/system/error.utils';
import { apiService } from '../services/api.service';

const router = useRouter();
const month = ref(getCurrentMonth());
const calendar = ref<MyInterviewCalendar | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const dayDialog = reactive({
  open: false,
  date: '',
});

const monthItems = computed(() => calendar.value?.items ?? []);
const dayItems = computed(() =>
  monthItems.value.filter((item) => item.plannedDate === dayDialog.date),
);
const summary = computed(() => ({
  total: monthItems.value.length,
  asInterviewer: monthItems.value.filter((item) => item.myRole === 'interviewer').length,
  asInterviewee: monthItems.value.filter((item) => item.myRole === 'interviewee').length,
  completed: monthItems.value.filter((item) => item.status === 'COMPLETED').length,
}));
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month.value}-01T00:00:00.000Z`)),
);

async function loadCalendar() {
  loading.value = true;
  errorMessage.value = '';

  try {
    calendar.value = await apiService.getMyInterviewCalendar({ month: month.value });
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить личный календарь собеседований.',
    );
  } finally {
    loading.value = false;
  }
}

function openDay(date: string) {
  dayDialog.open = true;
  dayDialog.date = date;
}

function openRuntime(id: string) {
  void router.push({ name: 'interview-runtime', params: { id } });
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
        <small>Мой календарь</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Я интервьюер</span>
        <strong>{{ summary.asInterviewer }}</strong>
        <small>Я собеседую</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Я кандидат</span>
        <strong>{{ summary.asInterviewee }}</strong>
        <small>Я прохожу</small>
      </article>
      <article class="surface-card summary-stat">
        <span>Завершено</span>
        <strong>{{ summary.completed }}</strong>
        <small>Завершённые записи</small>
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
      </div>
    </UiPanel>

    <div class="split-workspace interviews-user-layout">
      <UiPanel class="detail-panel interviews-calendar-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Мои собеседования</h2>
          </div>
        </div>

        <InterviewMonthCalendar
          v-if="calendar"
          :days="calendar.days.map((item) => item.date)"
          :items="monthItems"
          @select-day="openDay"
        />
      </UiPanel>

      <UiPanel class="detail-panel interviews-list-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Назначения месяца</h2>
          </div>
        </div>

        <div v-if="monthItems.length" class="interview-row-list">
          <article
            v-for="item in monthItems"
            :key="item.id"
            class="interview-row-card interview-row-card--stacked"
          >
            <div class="interview-row-card__copy">
              <strong>{{ interviewPartnerLabel(item) }}</strong>
              <small>{{ formatDateOnly(item.plannedDate) }} · {{ formatInterviewRole(item.myRole) }}</small>
            </div>
            <div class="interview-row-card__meta interview-row-card__meta--wrap">
              <v-chip :color="interviewStatusColor(item.status)" size="small" variant="tonal">
                {{ formatInterviewStatus(item.status) }}
              </v-chip>
              <UiButton
                v-if="item.myRole === 'interviewer' && item.status === 'SCHEDULED'"
                :icon="mdiPlayOutline"
                size="sm"
                @click="openRuntime(item.id)"
              >
                Открыть
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>{{ loading ? 'Загрузка' : 'Назначений пока нет' }}</p>
        </div>
      </UiPanel>
    </div>

    <v-dialog v-model="dayDialog.open" max-width="860">
      <UiPanel class="detail-panel" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>{{ formatDateOnly(dayDialog.date || null) }}</h2>
          </div>
        </div>

        <div v-if="dayItems.length" class="interview-row-list">
          <article
            v-for="item in dayItems"
            :key="item.id"
            class="interview-row-card interview-row-card--stacked"
          >
            <div class="interview-row-card__copy">
              <strong>{{ interviewPartnerLabel(item) }}</strong>
              <small>{{ formatInterviewRole(item.myRole) }} · {{ item.preset?.name ?? 'без пресета' }}</small>
            </div>
            <div class="interview-row-card__meta interview-row-card__meta--wrap">
              <v-chip :color="interviewStatusColor(item.status)" size="small" variant="tonal">
                {{ formatInterviewStatus(item.status) }}
              </v-chip>
              <UiButton
                v-if="item.myRole === 'interviewer' && item.status === 'SCHEDULED'"
                :icon="mdiPlayOutline"
                size="sm"
                @click="openRuntime(item.id)"
              >
                Открыть
              </UiButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state empty-state-panel">
          <p>На этот день записей нет</p>
        </div>
      </UiPanel>
    </v-dialog>
  </section>
</template>
