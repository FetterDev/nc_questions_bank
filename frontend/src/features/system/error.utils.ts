export function toUserErrorMessage(error: unknown, fallback: string) {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';

  if (!rawMessage) {
    return fallback;
  }

  if (
    /<!DOCTYPE html>/i.test(rawMessage) ||
    /Cannot (GET|POST|PATCH|PUT|DELETE)/i.test(rawMessage) ||
    /\[SDK:[^\]]+\]/.test(rawMessage) ||
    /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(rawMessage)
  ) {
    return `${fallback} Сервис недоступен.`;
  }

  const normalized = rawMessage
    .replace(/\[SDK:[^\]]+\]\s*/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || /^HTTP \d{3}$/i.test(normalized)) {
    return fallback;
  }

  return normalized.length > 160 ? fallback : normalized;
}
