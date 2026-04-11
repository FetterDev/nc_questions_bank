import { computed, reactive, readonly, toRefs } from 'vue';
import { apiService } from '../services/api.service';
import {
  formatRole,
  getStoredAccessToken,
  clearStoredAccessToken,
  setStoredAccessToken,
} from '../features/session/access-token';
import type {
  LoginPayload,
  SessionProfile,
} from '../features/session/session.types';
import { toUserErrorMessage } from '../features/system/error.utils';

const state = reactive({
  accessToken: getStoredAccessToken(),
  errorMessage: '',
  loaded: false,
  loading: false,
  profile: null as SessionProfile | null,
});

let inflight: Promise<SessionProfile | null> | null = null;

async function loadSession(force = false) {
  if (!state.accessToken) {
    state.profile = null;
    state.loaded = true;
    return null;
  }

  if (!force && state.loaded) {
    return state.profile;
  }

  if (!force && inflight) {
    return inflight;
  }

  state.loading = true;
  state.errorMessage = '';

  const request = apiService
    .getMe()
    .then((profile) => {
      state.profile = profile;
      state.loaded = true;
      state.accessToken = getStoredAccessToken();
      return profile;
    })
    .catch((error: unknown) => {
      const rawMessage =
        error instanceof Error ? error.message : String(error ?? '');

      if (/\b401\b/.test(rawMessage)) {
        clearSessionState();
        return null;
      }

      state.profile = null;
      state.loaded = true;
      state.errorMessage = toUserErrorMessage(
        error,
        'Не удалось загрузить сессию.',
      );
      throw error;
    })
    .finally(() => {
      state.loading = false;
      inflight = null;
    });

  inflight = request;
  return request;
}

async function login(payload: LoginPayload) {
  state.loading = true;
  state.errorMessage = '';

  try {
    const response = await apiService.login(payload);
    setStoredAccessToken(response.accessToken);
    state.accessToken = response.accessToken;
    state.loaded = false;
    await loadSession(true);
    return response.profile;
  } catch (error) {
    clearSessionState();
    state.errorMessage = toUserErrorMessage(error, 'Не удалось выполнить вход.');
    throw error;
  } finally {
    state.loading = false;
  }
}

function clearSessionState() {
  clearStoredAccessToken();
  state.accessToken = '';
  state.profile = null;
  state.loaded = true;
}

function logout() {
  clearSessionState();

  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

export function useSession() {
  const role = computed(() => state.profile?.role);
  const roleLabel = computed(() => formatRole(state.profile?.role));
  const isAdmin = computed(() => role.value === 'ADMIN');
  const isManager = computed(() => role.value === 'MANAGER');
  const isUser = computed(() => role.value === 'USER');
  const canManagePublishedQuestions = computed(() => isManager.value);
  const canManageQuestionBankCsv = computed(() => isAdmin.value);
  const canSubmitQuestionChangeRequests = computed(() => isUser.value);
  const isAuthenticated = computed(() => Boolean(state.accessToken));

  return {
    ...toRefs(readonly(state)),
    role,
    isAdmin,
    isManager,
    isUser,
    canManagePublishedQuestions,
    canManageQuestionBankCsv,
    canSubmitQuestionChangeRequests,
    isAuthenticated,
    roleLabel,
    login,
    loadSession,
    logout,
  };
}
