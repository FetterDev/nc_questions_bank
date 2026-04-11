import createClient, { type ClientOptions } from 'openapi-fetch';
import {
  getStoredAccessToken,
  handleUnauthorizedSession,
} from '../features/session/access-token';
import type {
  LoginPayload,
  LoginResponse,
  SessionProfile,
} from '../features/session/session.types';
import type {
  CreateUserPayload,
  ListUsersResponse,
  UpdateUserPayload,
  UserRecord,
} from '../features/users/users.types';
import type {
  AdminInterviewCalendar,
  AdminInterviewDashboard,
  CompleteInterviewPayload,
  CreateInterviewCyclePayload,
  CreateInterviewPairPayload,
  InterviewCalendarActiveCycle,
  InterviewCycle,
  InterviewItem,
  InterviewRuntime,
  MyInterviewCalendar,
  MyInterviewDashboard,
  UpdateInterviewPayload,
} from '../features/interviews/interviews.types';
import type { QuestionCsvImportReport } from '../features/questions/questions-import.types';
import type { components, paths } from './generated';

function formatError(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    return JSON.stringify(error);
  }

  return 'Unknown API error';
}

function ensureData<T>(
  result: { data?: T; error?: unknown; response: Response },
  operation: string,
): T {
  if (result.response.status === 401) {
    throw new Error('HTTP 401');
  }

  if (result.error) {
    throw new Error(`[SDK:${operation}] ${formatError(result.error)}`);
  }

  if (result.data === undefined) {
    throw new Error(`[SDK:${operation}] Empty response`);
  }

  return result.data;
}

function normalizeNullableString(
  value: string | null | Record<string, never> | undefined,
) {
  return typeof value === 'string' ? value : null;
}

function normalizeNullableObject<T extends object>(
  value: T | null | Record<string, never> | undefined,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return Object.keys(value).length > 0 ? value : null;
}

function normalizeNullableLiteral<T extends string>(
  value: T | null | Record<string, never> | undefined,
): T | null {
  return typeof value === 'string' ? value : null;
}

function buildPathWithQuery(
  path: string,
  query: Record<string, unknown> | undefined,
) {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      }
      continue;
    }

    params.set(key, String(rawValue));
  }

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function parseDownloadFileName(value: string | null) {
  if (!value) {
    return 'question-bank.csv';
  }

  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {}
  }

  return value.match(/filename="([^"]+)"/i)?.[1] || 'question-bank.csv';
}

function isQuestionCsvImportReport(
  value: unknown,
): value is components['schemas']['QuestionCsvImportReportDto'] {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'totals' in value &&
    'rows' in value,
  );
}

function normalizeQuestionCsvImportReport(
  value: components['schemas']['QuestionCsvImportReportDto'],
): QuestionCsvImportReport {
  return {
    applied: value.applied,
    fileName: value.fileName,
    delimiter: value.delimiter,
    warnings: value.warnings,
    topicsToCreate: value.topicsToCreate,
    companiesToCreate: value.companiesToCreate,
    totals: {
      totalRows: value.totals.totalRows,
      create: value.totals.create,
      update: value.totals.update,
      noChange: value.totals.noChange,
      error: value.totals.error,
      warning: value.totals.warning,
    },
    rows: value.rows.map((row) => ({
      rowNumber: row.rowNumber,
      summary: row.summary,
      errors: row.errors,
      warnings: row.warnings,
      normalized: {
        id: normalizeNullableString(row.normalized.id),
        topics: row.normalized.topics,
        questionText: row.normalized.questionText,
        questionCode: normalizeNullableString(row.normalized.questionCode),
        questionCodeLanguage: normalizeNullableLiteral(
          row.normalized.questionCodeLanguage,
        ),
        answerText: row.normalized.answerText,
        answerCode: normalizeNullableString(row.normalized.answerCode),
        answerCodeLanguage: normalizeNullableLiteral(
          row.normalized.answerCodeLanguage,
        ),
        difficulty: normalizeNullableLiteral(row.normalized.difficulty),
        company: normalizeNullableString(row.normalized.company),
      },
    })),
  };
}

function normalizeInterviewUser<T extends { id: string; login: string; displayName: string }>(
  value: T,
) {
  return {
    id: value.id,
    login: value.login,
    displayName: value.displayName,
  };
}

function normalizeInterviewItem<
  T extends {
    plannedDate: string | null | Record<string, never>;
    completedAt: string | null | Record<string, never>;
    preset: { id: string; name: string } | null | Record<string, never>;
    interviewer: { id: string; login: string; displayName: string };
    interviewee: { id: string; login: string; displayName: string };
  },
>(item: T) {
  return {
    ...item,
    plannedDate: normalizeNullableString(item.plannedDate),
    completedAt: normalizeNullableString(item.completedAt),
    preset: normalizeNullableObject(item.preset),
    interviewer: normalizeInterviewUser(item.interviewer),
    interviewee: normalizeInterviewUser(item.interviewee),
  };
}

function normalizeInterviewCycle<
  T extends InterviewCycle | InterviewCalendarActiveCycle,
>(cycle: T) {
  return {
    ...cycle,
    createdByAdmin: normalizeInterviewUser(cycle.createdByAdmin),
    interviews: cycle.interviews.map((item) => normalizeInterviewItem(item)),
  };
}

function isInterviewCycleLike(
  value: unknown,
): value is InterviewCycle | InterviewCalendarActiveCycle {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'id' in value &&
    'mode' in value &&
    'periodStart' in value &&
    'periodEnd' in value &&
    'createdByAdmin' in value &&
    'interviews' in value,
  );
}

function normalizeSessionProfile(profile: {
  id: string;
  login: string;
  email: string | null | Record<string, never>;
  displayName: string;
  role: SessionProfile['role'];
  status: 'ACTIVE' | 'DISABLED';
}): SessionProfile {
  return {
    ...profile,
    email: normalizeNullableString(profile.email),
  };
}

function normalizeUserRecord(record: {
  id: string;
  login: string;
  email: string | null | Record<string, never>;
  displayName: string;
  role: UserRecord['role'];
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}): UserRecord {
  return {
    ...record,
    email: normalizeNullableString(record.email),
  };
}

function normalizeTrainingHistorySession<
  T extends {
    feedback: string | null | Record<string, never>;
  },
>(session: T): Omit<T, 'feedback'> & { feedback: string | null } {
  return {
    ...session,
    feedback: normalizeNullableString(session.feedback),
  };
}

export function createApiSdk(options?: ClientOptions) {
  const authorizedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    const accessToken = getStoredAccessToken();

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(
      new Request(request, {
        headers,
      }),
    );

    if (response.status === 401) {
      handleUnauthorizedSession();
    }

    return response;
  };

  const client = createClient<paths>({
    baseUrl: '',
    fetch: authorizedFetch,
    ...options,
  });

  return {
    async login(body: LoginPayload): Promise<LoginResponse> {
      const result = await client.POST('/api/auth/login', { body });
      const data = ensureData(result, 'login');

      return {
        ...data,
        profile: normalizeSessionProfile(data.profile),
      };
    },

    async getMe(): Promise<SessionProfile> {
      const result = await client.GET('/api/me');
      return normalizeSessionProfile(ensureData(result, 'getMe'));
    },

    async listUsers(
      query?: paths['/api/users']['get']['parameters']['query'],
    ): Promise<ListUsersResponse> {
      const result = await client.GET('/api/users', {
        params: { query },
      });
      const data = ensureData(result, 'listUsers');

      return {
        ...data,
        items: data.items.map((item) => normalizeUserRecord(item)),
      };
    },

    async createUser(body: CreateUserPayload): Promise<UserRecord> {
      const result = await client.POST('/api/users', {
        body:
          body as paths['/api/users']['post']['requestBody']['content']['application/json'],
      });
      return normalizeUserRecord(ensureData(result, 'createUser'));
    },

    async updateUser(
      id: string,
      body: UpdateUserPayload,
    ): Promise<UserRecord> {
      const result = await client.PATCH('/api/users/{id}', {
        params: { path: { id } },
        body:
          body as paths['/api/users/{id}']['patch']['requestBody']['content']['application/json'],
      });
      return normalizeUserRecord(ensureData(result, 'updateUser'));
    },

    async resetUserPassword(
      id: string,
      body: paths['/api/users/{id}/reset-password']['post']['requestBody']['content']['application/json'],
    ): Promise<UserRecord> {
      const result = await client.POST('/api/users/{id}/reset-password', {
        params: { path: { id } },
        body,
      });
      return normalizeUserRecord(ensureData(result, 'resetUserPassword'));
    },

    async deactivateUser(id: string): Promise<UserRecord> {
      const result = await client.POST('/api/users/{id}/deactivate', {
        params: { path: { id } },
      });
      return normalizeUserRecord(ensureData(result, 'deactivateUser'));
    },

    async activateUser(id: string): Promise<UserRecord> {
      const result = await client.POST('/api/users/{id}/activate', {
        params: { path: { id } },
      });
      return normalizeUserRecord(ensureData(result, 'activateUser'));
    },

    async getGrowthAnalytics() {
      const result = await client.GET('/api/analytics/growth');
      return ensureData(result, 'getGrowthAnalytics');
    },

    async getBankAnalytics() {
      const result = await client.GET('/api/analytics/bank');
      return ensureData(result, 'getBankAnalytics');
    },

    async listQuestions(
      query?: paths['/api/questions']['get']['parameters']['query'],
    ) {
      const result = await client.GET('/api/questions', {
        params: { query },
      });
      return ensureData(result, 'listQuestions');
    },

    async getQuestion(id: string) {
      const result = await client.GET('/api/questions/{id}', {
        params: { path: { id } },
      });
      return ensureData(result, 'getQuestion');
    },

    async createQuestion(
      body: paths['/api/questions']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/questions', { body });
      return ensureData(result, 'createQuestion');
    },

    async updateQuestion(
      id: string,
      body: paths['/api/questions/{id}']['patch']['requestBody']['content']['application/json'],
    ) {
      const result = await client.PATCH('/api/questions/{id}', {
        params: { path: { id } },
        body,
      });
      return ensureData(result, 'updateQuestion');
    },

    async markQuestionInterviewEncounter(id: string) {
      const result = await client.PUT('/api/questions/{id}/interview-encounter', {
        params: { path: { id } },
      });
      return ensureData(result, 'markQuestionInterviewEncounter');
    },

    async unmarkQuestionInterviewEncounter(id: string) {
      const result = await client.DELETE('/api/questions/{id}/interview-encounter', {
        params: { path: { id } },
      });
      return ensureData(result, 'unmarkQuestionInterviewEncounter');
    },

    async deleteQuestion(id: string) {
      const { response } = await client.DELETE('/api/questions/{id}', {
        params: { path: { id } },
      });

      if (response.status === 401) {
        throw new Error('HTTP 401');
      }

      if (!response.ok) {
        throw new Error(`[SDK:deleteQuestion] HTTP ${response.status}`);
      }
    },

    async exportQuestionsCsv(
      query?: paths['/api/questions/export']['get']['parameters']['query'],
    ) {
      const response = await authorizedFetch(
        buildPathWithQuery('/api/questions/export', query),
      );

      if (response.status === 401) {
        throw new Error('HTTP 401');
      }

      if (!response.ok) {
        throw new Error(`[SDK:exportQuestionsCsv] HTTP ${response.status}`);
      }

      return {
        blob: await response.blob(),
        fileName: parseDownloadFileName(
          response.headers.get('content-disposition'),
        ),
      };
    },

    async previewQuestionsCsvImport(file: File): Promise<QuestionCsvImportReport> {
      const result = await submitQuestionsCsvImport(
        '/api/questions/import/preview',
        file,
        'previewQuestionsCsvImport',
      );

      return result.report;
    },

    async commitQuestionsCsvImport(file: File) {
      return submitQuestionsCsvImport(
        '/api/questions/import/commit',
        file,
        'commitQuestionsCsvImport',
      );
    },

    async searchQuestions(
      query?: paths['/api/search/questions']['get']['parameters']['query'],
    ) {
      const result = await client.GET('/api/search/questions', {
        params: { query },
      });
      return ensureData(result, 'searchQuestions');
    },

    async listTrainingPresets() {
      const result = await client.GET('/api/training/presets');
      return ensureData(result, 'listTrainingPresets');
    },

    async listTrainingParticipants() {
      const result = await client.GET('/api/training/participants');
      return ensureData(result, 'listTrainingParticipants');
    },

    async listTrainingHistory() {
      const result = await client.GET('/api/training/history');
      const data = ensureData(result, 'listTrainingHistory');

      return {
        ...data,
        items: data.items.map((item) => normalizeTrainingHistorySession(item)),
      };
    },

    async getTrainingHistoryDetail(id: string) {
      const result = await client.GET('/api/training/history/{id}', {
        params: { path: { id } },
      });
      return normalizeTrainingHistorySession(ensureData(result, 'getTrainingHistoryDetail'));
    },

    async createTrainingPreset(
      body: paths['/api/training/presets']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/training/presets', { body });
      return ensureData(result, 'createTrainingPreset');
    },

    async updateTrainingPreset(
      id: string,
      body: paths['/api/training/presets/{id}']['patch']['requestBody']['content']['application/json'],
    ) {
      const result = await client.PATCH('/api/training/presets/{id}', {
        params: { path: { id } },
        body,
      });
      return ensureData(result, 'updateTrainingPreset');
    },

    async deleteTrainingPreset(id: string) {
      const { response } = await client.DELETE('/api/training/presets/{id}', {
        params: { path: { id } },
      });

      if (response.status === 401) {
        throw new Error('HTTP 401');
      }

      if (!response.ok) {
        throw new Error(`[SDK:deleteTrainingPreset] HTTP ${response.status}`);
      }
    },

    async prepareTraining(
      body: paths['/api/training/prepare']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/training/prepare', { body });
      return ensureData(result, 'prepareTraining');
    },

    async saveTrainingResults(
      body: paths['/api/training/results']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/training/results', { body });
      return ensureData(result, 'saveTrainingResults');
    },

    async createInterviewCycle(
      body: CreateInterviewCyclePayload,
    ): Promise<InterviewCycle> {
      const result = await client.POST('/api/interviews/cycles', {
        body:
          body as paths['/api/interviews/cycles']['post']['requestBody']['content']['application/json'],
      });
      return normalizeInterviewCycle(ensureData(result, 'createInterviewCycle'));
    },

    async getInterviewCycleDetail(id: string): Promise<InterviewCycle> {
      const result = await client.GET('/api/interviews/cycles/{id}', {
        params: { path: { id } },
      });
      return normalizeInterviewCycle(ensureData(result, 'getInterviewCycleDetail'));
    },

    async createInterviewPair(
      id: string,
      body: CreateInterviewPairPayload,
    ): Promise<InterviewItem> {
      const result = await client.POST('/api/interviews/cycles/{id}/pairs', {
        params: { path: { id } },
        body:
          body as paths['/api/interviews/cycles/{id}/pairs']['post']['requestBody']['content']['application/json'],
      });
      return normalizeInterviewItem(ensureData(result, 'createInterviewPair'));
    },

    async updateInterview(
      id: string,
      body: UpdateInterviewPayload,
    ): Promise<InterviewItem> {
      const result = await client.PATCH('/api/interviews/{id}', {
        params: { path: { id } },
        body:
          body as paths['/api/interviews/{id}']['patch']['requestBody']['content']['application/json'],
      });
      return normalizeInterviewItem(ensureData(result, 'updateInterview'));
    },

    async deleteInterview(id: string) {
      const { response } = await client.DELETE('/api/interviews/{id}', {
        params: { path: { id } },
      });

      if (response.status === 401) {
        throw new Error('HTTP 401');
      }

      if (!response.ok) {
        throw new Error(`[SDK:deleteInterview] HTTP ${response.status}`);
      }
    },

    async getAdminInterviewCalendar(
      query?: paths['/api/interviews/admin-calendar']['get']['parameters']['query'],
    ): Promise<AdminInterviewCalendar> {
      const result = await client.GET('/api/interviews/admin-calendar', {
        params: { query },
      });
      const data = ensureData(result, 'getAdminInterviewCalendar');
      const normalizedActiveCycle =
        isInterviewCycleLike(data.activeCycle)
          ? normalizeInterviewCycle(data.activeCycle)
          : null;

      return {
        ...data,
        activeCycle: normalizedActiveCycle,
        items: data.items.map((item) => normalizeInterviewItem(item)),
      };
    },

    async getMyInterviewCalendar(
      query?: paths['/api/interviews/my-calendar']['get']['parameters']['query'],
    ): Promise<MyInterviewCalendar> {
      const result = await client.GET('/api/interviews/my-calendar', {
        params: { query },
      });
      const data = ensureData(result, 'getMyInterviewCalendar');

      return {
        ...data,
        items: data.items.map((item) => normalizeInterviewItem(item)),
      };
    },

    async getInterviewRuntime(id: string): Promise<InterviewRuntime> {
      const result = await client.GET('/api/interviews/{id}/runtime', {
        params: { path: { id } },
      });
      const data = ensureData(result, 'getInterviewRuntime');

      return {
        ...data,
        interview: normalizeInterviewItem(data.interview),
        counterpart: normalizeInterviewUser(data.counterpart),
      };
    },

    async completeInterview(
      id: string,
      body: CompleteInterviewPayload,
    ): Promise<InterviewItem> {
      const result = await client.POST('/api/interviews/{id}/complete', {
        params: { path: { id } },
        body:
          body as paths['/api/interviews/{id}/complete']['post']['requestBody']['content']['application/json'],
      });
      return normalizeInterviewItem(ensureData(result, 'completeInterview'));
    },

    async getAdminInterviewDashboard(
      query?: paths['/api/interviews/admin-dashboard']['get']['parameters']['query'],
    ): Promise<AdminInterviewDashboard> {
      const result = await client.GET('/api/interviews/admin-dashboard', {
        params: { query },
      });
      return ensureData(result, 'getAdminInterviewDashboard');
    },

    async getMyInterviewDashboard(
      query?: paths['/api/interviews/my-dashboard']['get']['parameters']['query'],
    ): Promise<MyInterviewDashboard> {
      const result = await client.GET('/api/interviews/my-dashboard', {
        params: { query },
      });
      return ensureData(result, 'getMyInterviewDashboard');
    },

    async listTopics(
      query?: paths['/api/topics']['get']['parameters']['query'],
    ) {
      const result = await client.GET('/api/topics', {
        params: { query },
      });
      return ensureData(result, 'listTopics');
    },

    async listAllTopics(
      query?: Omit<NonNullable<paths['/api/topics']['get']['parameters']['query']>, 'limit' | 'offset'>,
    ) {
      const items: paths['/api/topics']['get']['responses'][200]['content']['application/json']['items'] =
        [];
      const limit = 100;
      let offset = 0;
      let total = 0;

      do {
        const batch = await this.listTopics({
          ...query,
          limit,
          offset,
        });

        items.push(...batch.items);
        total = batch.total;
        offset += batch.items.length;

        if (batch.items.length === 0) {
          break;
        }
      } while (offset < total);

      return items;
    },

    async listCompanies(
      query?: paths['/api/companies']['get']['parameters']['query'],
    ) {
      const result = await client.GET('/api/companies', {
        params: { query },
      });
      return ensureData(result, 'listCompanies');
    },

    async listAllCompanies(
      query?: Omit<NonNullable<paths['/api/companies']['get']['parameters']['query']>, 'limit' | 'offset'>,
    ) {
      const items: paths['/api/companies']['get']['responses'][200]['content']['application/json']['items'] =
        [];
      const limit = 100;
      let offset = 0;
      let total = 0;

      do {
        const batch = await this.listCompanies({
          ...query,
          limit,
          offset,
        });

        items.push(...batch.items);
        total = batch.total;
        offset += batch.items.length;

        if (batch.items.length === 0) {
          break;
        }
      } while (offset < total);

      return items;
    },

    async createCompany(
      body: paths['/api/companies']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/companies', { body });
      return ensureData(result, 'createCompany');
    },

    async updateCompany(
      id: string,
      body: paths['/api/companies/{id}']['patch']['requestBody']['content']['application/json'],
    ) {
      const result = await client.PATCH('/api/companies/{id}', {
        params: { path: { id } },
        body,
      });
      return ensureData(result, 'updateCompany');
    },

    async createTopic(
      body: paths['/api/topics']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/topics', { body });
      return ensureData(result, 'createTopic');
    },

    async updateTopic(
      id: string,
      body: paths['/api/topics/{id}']['patch']['requestBody']['content']['application/json'],
    ) {
      const result = await client.PATCH('/api/topics/{id}', {
        params: { path: { id } },
        body,
      });
      return ensureData(result, 'updateTopic');
    },

    async createQuestionChangeRequest(
      body: paths['/api/question-change-requests']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/question-change-requests', { body });
      return ensureData(result, 'createQuestionChangeRequest');
    },

    async listMyQuestionChangeRequests() {
      const result = await client.GET('/api/question-change-requests/my');
      return ensureData(result, 'listMyQuestionChangeRequests');
    },

    async listReviewQuestionChangeRequests() {
      const result = await client.GET('/api/question-change-requests/review');
      return ensureData(result, 'listReviewQuestionChangeRequests');
    },

    async getQuestionChangeRequest(id: string) {
      const result = await client.GET('/api/question-change-requests/{id}', {
        params: { path: { id } },
      });
      return ensureData(result, 'getQuestionChangeRequest');
    },

    async approveQuestionChangeRequest(id: string) {
      const result = await client.POST('/api/question-change-requests/{id}/approve', {
        params: { path: { id } },
      });
      return ensureData(result, 'approveQuestionChangeRequest');
    },

    async rejectQuestionChangeRequest(
      id: string,
      body: paths['/api/question-change-requests/{id}/reject']['post']['requestBody']['content']['application/json'],
    ) {
      const result = await client.POST('/api/question-change-requests/{id}/reject', {
        params: { path: { id } },
        body,
      });
      return ensureData(result, 'rejectQuestionChangeRequest');
    },
  };

  async function submitQuestionsCsvImport(
    path: '/api/questions/import/preview' | '/api/questions/import/commit',
    file: File,
    operation: 'previewQuestionsCsvImport' | 'commitQuestionsCsvImport',
  ) {
    const body = new FormData();
    body.set('file', file);

    const response = await authorizedFetch(path, {
      method: 'POST',
      body,
    });

    if (response.status === 401) {
      throw new Error('HTTP 401');
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(`[SDK:${operation}] HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;

    if (!isQuestionCsvImportReport(payload)) {
      throw new Error(`[SDK:${operation}] Invalid import payload`);
    }

    if (!response.ok && response.status !== 400) {
      throw new Error(`[SDK:${operation}] HTTP ${response.status}`);
    }

    return {
      status: response.status,
      report: normalizeQuestionCsvImportReport(payload),
    };
  }
}
