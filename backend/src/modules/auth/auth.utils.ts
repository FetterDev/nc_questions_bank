import { BadRequestException } from '@nestjs/common';
import {
  LOGIN_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './auth.constants';

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeOptionalEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized || null;
}

export function validateLogin(value: string) {
  const normalized = normalizeLogin(value);

  if (!LOGIN_PATTERN.test(normalized)) {
    throw new BadRequestException(
      'Login must match [a-z0-9._-]{3,64}',
    );
  }

  return normalized;
}

export function validatePassword(value: string) {
  const normalized = value ?? '';

  if (
    normalized.length < PASSWORD_MIN_LENGTH ||
    normalized.length > PASSWORD_MAX_LENGTH
  ) {
    throw new BadRequestException(
      `Password length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    );
  }

  return normalized;
}
