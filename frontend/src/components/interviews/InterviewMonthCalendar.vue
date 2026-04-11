<script setup lang="ts">
import { computed } from 'vue';
import type { InterviewItem, MyInterviewCalendarItem } from '../../features/interviews/interviews.types';
import {
  buildMonthGrid,
  interviewsByDate,
} from '../../features/interviews/interviews.utils';

const props = defineProps<{
  days: string[];
  items: Array<InterviewItem | MyInterviewCalendarItem>;
}>();

const emit = defineEmits<{
  (event: 'select-day', value: string): void;
}>();

const grouped = computed(() => interviewsByDate(props.items));
const cells = computed(() => buildMonthGrid(props.days));

function itemsByDate(date: string | null) {
  if (!date) {
    return [];
  }

  return grouped.value.get(date) ?? [];
}

function visibleItems(date: string | null) {
  const items = itemsByDate(date);

  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 6);
}

function hiddenCount(date: string | null) {
  const items = itemsByDate(date);

  if (!Array.isArray(items)) {
    return 0;
  }

  return Math.max(0, items.length - 6);
}

function openDay(date: string | null) {
  if (!date) {
    return;
  }

  emit('select-day', date);
}
</script>

<template>
  <div class="interview-calendar">
    <div class="interview-calendar__weekdays">
      <span>Пн</span>
      <span>Вт</span>
      <span>Ср</span>
      <span>Чт</span>
      <span>Пт</span>
      <span>Сб</span>
      <span>Вс</span>
    </div>

    <div class="interview-calendar__grid">
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="interview-calendar__cell"
        :class="{ 'interview-calendar__cell--empty': !cell.date }"
        :disabled="!cell.date"
        @click="openDay(cell.date)"
      >
        <template v-if="cell.date">
          <strong>{{ Number(cell.date.slice(-2)) }}</strong>
          <div v-if="visibleItems(cell.date).length" class="interview-calendar__markers">
            <span
              v-for="item in visibleItems(cell.date)"
              :key="item.id"
              class="interview-calendar__marker"
              :class="`interview-calendar__marker--${item.status.toLowerCase()}`"
            />
            <small
              v-if="hiddenCount(cell.date) > 0"
              class="interview-calendar__more"
            >
              +{{ hiddenCount(cell.date) }}
            </small>
          </div>
        </template>
      </button>
    </div>
  </div>
</template>
