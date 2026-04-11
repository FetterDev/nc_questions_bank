import type {
  QuestionChangeRequestDetail,
  QuestionChangeRequestSummary,
} from './moderation.types';

export function formatChangeRequestStatus(
  status: QuestionChangeRequestSummary['status'],
) {
  if (status === 'PENDING') {
    return 'На проверке';
  }

  if (status === 'APPROVED') {
    return 'Одобрено';
  }

  return 'Отклонено';
}

export function statusTone(status: QuestionChangeRequestSummary['status']) {
  if (status === 'PENDING') {
    return 'secondary';
  }

  if (status === 'APPROVED') {
    return 'success';
  }

  return 'error';
}

export function formatChangeRequestType(
  type: QuestionChangeRequestSummary['type'],
) {
  if (type === 'CREATE') {
    return 'Создание';
  }

  if (type === 'UPDATE') {
    return 'Изменение';
  }

  return 'Удаление';
}

export function buildChangeRequestSubject(
  item: QuestionChangeRequestSummary | QuestionChangeRequestDetail,
) {
  return item.subject || 'Без названия';
}
