import type { components } from '../../sdk';

export type UserRecord = Omit<components['schemas']['UserDto'], 'email'> & {
  email: string | null;
};
export type ListUsersResponse = Omit<
  components['schemas']['ListUsersResponseDto'],
  'items'
> & {
  items: UserRecord[];
};
export type CreateUserPayload = Omit<
  components['schemas']['CreateUserDto'],
  'email'
> & {
  email?: string | null;
};
export type UpdateUserPayload = Omit<
  components['schemas']['UpdateUserDto'],
  'email'
> & {
  email?: string | null;
};
export type ResetUserPasswordPayload =
  components['schemas']['ResetUserPasswordDto'];
export type UserRoleValue = UserRecord['role'];
export type UserStatusValue = UserRecord['status'];
