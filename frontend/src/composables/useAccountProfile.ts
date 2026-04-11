import { computed } from 'vue';
import { useSession } from './useSession';
import { formatStatus } from '../features/session/access-token';

export type AccountProfile = {
  avatarLabel: string;
  email: string;
  fullName: string;
  login: string;
  role: string;
  status: string;
};

export function useAccountProfile() {
  const session = useSession();

  const profile = computed<AccountProfile>(() => {
    const email = session.profile.value?.email ?? 'Email не задан';
    const displayName = session.profile.value?.displayName ?? 'Пользователь';
    const avatarLabel = displayName
      .split(/\s+/)
      .map((item) => item.slice(0, 1))
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      avatarLabel,
      email,
      fullName: displayName,
      login: session.profile.value?.login ?? 'Неизвестно',
      role: session.roleLabel.value,
      status: formatStatus(session.profile.value?.status),
    };
  });

  return {
    profile,
    session,
  };
}
