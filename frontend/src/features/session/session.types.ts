import type { components } from '../../sdk';

export type SessionProfile = Omit<components['schemas']['MeDto'], 'email'> & {
  email: string | null;
};
export type SessionRole = SessionProfile['role'];
export type LoginPayload = components['schemas']['LoginDto'];
export type LoginResponse = Omit<
  components['schemas']['LoginResponseDto'],
  'profile'
> & {
  profile: SessionProfile;
};
