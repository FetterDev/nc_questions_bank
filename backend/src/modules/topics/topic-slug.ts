import { BadRequestException } from '@nestjs/common';

export function normalizeTopicName(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('Topic name cannot be empty');
  }

  return normalized;
}

export function buildTopicSlug(value: string) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new BadRequestException('Topic slug cannot be empty');
  }

  return slug;
}
