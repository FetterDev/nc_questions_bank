import { BadRequestException } from '@nestjs/common';

export function normalizeCompetencyName(value: string, label = 'Competency name') {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`${label} cannot be empty`);
  }

  return normalized;
}

export function normalizeOptionalDescription(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function buildCompetencySlug(value: string) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new BadRequestException('Competency slug cannot be empty');
  }

  return slug;
}
