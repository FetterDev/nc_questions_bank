import type {
  AdminInterviewDashboard,
  InterviewItem,
  InterviewRoleValue,
  InterviewStatusValue,
  MyInterviewDashboard,
} from './interviews.types';

export function formatInterviewStatus(status: InterviewStatusValue) {
  if (status === 'DRAFT') {
    return 'draft';
  }

  if (status === 'PLANNED') {
    return 'planned';
  }

  if (status === 'SCHEDULED') {
    return 'scheduled';
  }

  return 'completed';
}

export function interviewStatusColor(status: InterviewStatusValue) {
  if (status === 'DRAFT') {
    return 'secondary';
  }

  if (status === 'PLANNED') {
    return 'warning';
  }

  if (status === 'SCHEDULED') {
    return 'primary';
  }

  return 'success';
}

export function formatInterviewRole(role: InterviewRoleValue) {
  return role === 'interviewer' ? 'я собеседую' : 'я прохожу';
}

export function formatDateOnly(value: string | null) {
  if (!value) {
    return 'без даты';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return 'нет данных';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function shiftMonth(month: string, delta: number) {
  const [yearPart, monthPart] = month.split('-').map((item) => Number(item));
  const shifted = new Date(Date.UTC(yearPart, monthPart - 1 + delta, 1));

  return shifted.toISOString().slice(0, 7);
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function buildMonthGrid(days: string[]) {
  const cells: Array<{ date: string | null; key: string; isCurrentMonth: boolean }> = [];

  if (!days.length) {
    return cells;
  }

  const firstDate = new Date(`${days[0]}T00:00:00.000Z`);
  const startOffset = firstDate.getUTCDay() === 0 ? 6 : firstDate.getUTCDay() - 1;

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({
      date: null,
      key: `empty:start:${index}`,
      isCurrentMonth: false,
    });
  }

  for (const day of days) {
    cells.push({
      date: day,
      key: day,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      date: null,
      key: `empty:end:${cells.length}`,
      isCurrentMonth: false,
    });
  }

  return cells;
}

export function interviewsByDate<T extends { plannedDate: string | null }>(items: T[]) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    if (!item.plannedDate) {
      continue;
    }

    const existing = grouped.get(item.plannedDate) ?? [];
    existing.push(item);
    grouped.set(item.plannedDate, existing);
  }

  return grouped;
}

export function chartMax(values: number[]) {
  return Math.max(1, ...values);
}

export function adminDashboardOutcomeTotal(data: AdminInterviewDashboard) {
  return (
    data.outcomeMix.correctCount +
    data.outcomeMix.partialCount +
    data.outcomeMix.incorrectCount
  );
}

export function myDashboardOutcomeTotal(data: MyInterviewDashboard) {
  return data.summary.correctCount + data.summary.partialCount + data.summary.incorrectCount;
}

export function interviewPartnerLabel(item: InterviewItem) {
  return `${item.interviewer.displayName} - ${item.interviewee.displayName}`;
}
