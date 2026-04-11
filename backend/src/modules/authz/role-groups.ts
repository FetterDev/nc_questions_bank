import { UserRole } from '@prisma/client';

export const ALL_ROLES = [
  UserRole.USER,
  UserRole.MANAGER,
  UserRole.ADMIN,
] as const;

export const USER_AND_MANAGER_ROLES = [
  UserRole.USER,
  UserRole.MANAGER,
] as const;

export const USER_ONLY_ROLES = [UserRole.USER] as const;
export const MANAGER_ONLY_ROLES = [UserRole.MANAGER] as const;
