const STORAGE_KEY = 'nord.access.token';

export function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setStoredAccessToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredAccessToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function formatRole(role?: 'ADMIN' | 'MANAGER' | 'USER') {
  if (role === 'ADMIN') {
    return 'Администратор';
  }

  if (role === 'MANAGER') {
    return 'Менеджер';
  }

  return 'Пользователь';
}

export function formatStatus(status?: 'ACTIVE' | 'DISABLED') {
  return status === 'DISABLED' ? 'Отключен' : 'Активен';
}

export function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams();

  if (currentPath && currentPath !== '/login') {
    params.set('redirect', currentPath);
  }

  const target = params.size > 0 ? `/login?${params.toString()}` : '/login';
  window.location.replace(target);
}

export function handleUnauthorizedSession() {
  clearStoredAccessToken();

  if (typeof window === 'undefined' || window.location.pathname === '/login') {
    return;
  }

  redirectToLogin();
}
