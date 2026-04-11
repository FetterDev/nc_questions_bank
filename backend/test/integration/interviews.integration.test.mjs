import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  apiRequest,
  bootstrapAdmin,
  buildUserCredentials,
  login,
  prepareDatabase,
  startServer,
  stopServer,
} from './support.mjs';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.TEST_BACKEND_PORT || 3105);
const baseUrl = `http://127.0.0.1:${port}/api`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

let serverProcess = null;
let adminToken = '';
let managerToken = '';
const interviewUsers = [];
const tokenByUserId = new Map();

async function api(path, options = {}, actor = 'admin') {
  const accessToken =
    actor === 'manager'
      ? managerToken
      : actor === 'admin'
      ? adminToken
      : tokenByUserId.get(actor) ?? '';

  return apiRequest(baseUrl, path, options, accessToken);
}

function weekBounds(offsetWeeks = 0) {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(
    utc.getTime() + (diffToMonday + offsetWeeks * 7) * 24 * 60 * 60 * 1000,
  );
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    plannedDate: new Date(start.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  };
}

async function createInterviewUser(prefix) {
  const credentials = buildUserCredentials(prefix);
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...credentials,
      role: 'USER',
    }),
  });

  assert.equal(created.response.status, 201);

  const userLogin = await login(
    baseUrl,
    credentials.login,
    credentials.password,
  );

  assert.equal(userLogin.response.status, 200);

  const record = {
    id: created.payload.id,
    login: credentials.login,
    token: userLogin.payload.accessToken,
  };

  interviewUsers.push(record);
  tokenByUserId.set(record.id, record.token);
  return record;
}

async function createCycle(offsetWeeks, participantIds) {
  const bounds = weekBounds(offsetWeeks);
  const created = await api('/interviews/cycles', {
    method: 'POST',
    body: JSON.stringify({
      periodStart: bounds.periodStart,
      periodEnd: bounds.periodEnd,
      participantIds,
    }),
  }, 'manager');

  assert.equal(created.response.status, 201);
  return {
    bounds,
    cycle: created.payload,
  };
}

async function getAngularPresetId() {
  const presets = await api('/training/presets', {}, 'manager');

  assert.equal(presets.response.status, 200);
  const angularPreset = presets.payload.find((item) => item.name === 'Angular Developer');

  assert.ok(angularPreset);
  return angularPreset.id;
}

before(async () => {
  await prepareDatabase(backendDir, databaseUrl, { seed: true });
  serverProcess = await startServer(backendDir, databaseUrl, port);

  const adminLogin = await login(
    baseUrl,
    bootstrapAdmin.login,
    bootstrapAdmin.password,
  );

  assert.equal(adminLogin.response.status, 200);
  adminToken = adminLogin.payload.accessToken;

  const managerCredentials = buildUserCredentials('interview-manager');
  const createdManager = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...managerCredentials,
      role: 'MANAGER',
    }),
  });

  assert.equal(createdManager.response.status, 201);

  const managerLogin = await login(
    baseUrl,
    managerCredentials.login,
    managerCredentials.password,
  );

  assert.equal(managerLogin.response.status, 200);
  managerToken = managerLogin.payload.accessToken;

  await createInterviewUser('interview-alpha');
  await createInterviewUser('interview-beta');
  await createInterviewUser('interview-gamma');
});

after(async () => {
  await stopServer(serverProcess);
});

test('POST /api/interviews/cycles creates directed weekly draft coverage for each participant', async () => {
  const { cycle } = await createCycle(
    2,
    interviewUsers.map((user) => user.id),
  );

  assert.equal(cycle.mode, 'AUTO');
  assert.equal(cycle.interviews.length, interviewUsers.length);
  assert.equal(cycle.draftCount, interviewUsers.length);
  assert.equal(cycle.plannedCount, 0);
  assert.equal(cycle.scheduledCount, 0);
  assert.equal(cycle.completedCount, 0);

  const outgoingCounts = new Map();
  const incomingCounts = new Map();
  const pairKeys = new Set();

  for (const item of cycle.interviews) {
    assert.equal(item.status, 'DRAFT');
    assert.equal(item.plannedDate, null);
    assert.equal(item.preset, null);
    assert.notEqual(item.interviewer.id, item.interviewee.id);

    outgoingCounts.set(
      item.interviewer.id,
      (outgoingCounts.get(item.interviewer.id) ?? 0) + 1,
    );
    incomingCounts.set(
      item.interviewee.id,
      (incomingCounts.get(item.interviewee.id) ?? 0) + 1,
    );

    const key = `${item.interviewer.id}->${item.interviewee.id}`;
    assert.equal(pairKeys.has(key), false);
    pairKeys.add(key);
  }

  for (const user of interviewUsers) {
    assert.equal(outgoingCounts.get(user.id), 1);
    assert.equal(incomingCounts.get(user.id), 1);
  }
});

test('scheduled interview runtime and completion are available only to interviewer', async () => {
  const { bounds, cycle } = await createCycle(
    0,
    interviewUsers.map((user) => user.id),
  );
  const presetId = await getAngularPresetId();
  const scheduledInterview = cycle.interviews[0];

  const scheduled = await api(`/interviews/${scheduledInterview.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plannedDate: bounds.plannedDate,
      presetId,
    }),
  }, 'manager');

  assert.equal(scheduled.response.status, 200);
  assert.equal(scheduled.payload.status, 'SCHEDULED');
  assert.equal(scheduled.payload.plannedDate, bounds.plannedDate);
  assert.equal(scheduled.payload.preset.id, presetId);

  const calendar = await api(
    `/interviews/my-calendar?month=${bounds.plannedDate.slice(0, 7)}`,
    {},
    scheduledInterview.interviewer.id,
  );

  assert.equal(calendar.response.status, 200);
  const calendarEntry = calendar.payload.items.find(
    (item) => item.id === scheduledInterview.id,
  );
  assert.ok(calendarEntry);
  assert.equal(calendarEntry.myRole, 'interviewer');

  const dashboardBeforeCompletion = await api(
    `/interviews/admin-dashboard?from=${bounds.periodStart}&to=${bounds.periodEnd}`,
    {},
    'manager',
  );

  assert.equal(dashboardBeforeCompletion.response.status, 200);
  const completedBefore = dashboardBeforeCompletion.payload.summary.completedCount;
  const outcomesBefore =
    dashboardBeforeCompletion.payload.outcomeMix.correctCount +
    dashboardBeforeCompletion.payload.outcomeMix.partialCount +
    dashboardBeforeCompletion.payload.outcomeMix.incorrectCount;

  const forbiddenForInterviewee = await api(
    `/interviews/${scheduledInterview.id}/runtime`,
    {},
    scheduledInterview.interviewee.id,
  );
  assert.equal(forbiddenForInterviewee.response.status, 403);

  const forbiddenForAdmin = await api(`/interviews/${scheduledInterview.id}/runtime`);
  assert.equal(forbiddenForAdmin.response.status, 403);

  const runtime = await api(
    `/interviews/${scheduledInterview.id}/runtime`,
    {},
    scheduledInterview.interviewer.id,
  );

  assert.equal(runtime.response.status, 200);
  assert.ok(runtime.payload.items.length > 0);
  assert.ok(runtime.payload.items.every((item) => typeof item.answerContent.text === 'string'));

  const foreignComplete = await api(
    `/interviews/${scheduledInterview.id}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({
        items: runtime.payload.items.map((item) => ({
          interviewQuestionId: item.id,
          result: 'correct',
        })),
      }),
    },
    scheduledInterview.interviewee.id,
  );
  assert.equal(foreignComplete.response.status, 403);

  const completion = await api(
    `/interviews/${scheduledInterview.id}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({
        feedback: 'Нужно точнее аргументировать выбор решений.',
        items: runtime.payload.items.map((item, index) => ({
          interviewQuestionId: item.id,
          result:
            index % 3 === 0
              ? 'correct'
              : index % 3 === 1
                ? 'partial'
                : 'incorrect',
        })),
      }),
    },
    scheduledInterview.interviewer.id,
  );

  assert.equal(completion.response.status, 200);
  assert.equal(completion.payload.status, 'COMPLETED');
  assert.equal(completion.payload.resultsCount, runtime.payload.items.length);
  assert.ok(completion.payload.completedAt);

  const editCompleted = await api(`/interviews/${scheduledInterview.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plannedDate: null,
    }),
  }, 'manager');
  assert.equal(editCompleted.response.status, 400);

  const intervieweeDashboard = await api(
    `/interviews/my-dashboard?from=${bounds.periodStart}&to=${bounds.periodEnd}`,
    {},
    scheduledInterview.interviewee.id,
  );

  assert.equal(intervieweeDashboard.response.status, 200);
  assert.equal(intervieweeDashboard.payload.summary.completedCount, 1);
  assert.equal(
    intervieweeDashboard.payload.summary.resultsCount,
    runtime.payload.items.length,
  );
  assert.ok(
    intervieweeDashboard.payload.feedbackEntries.some(
      (entry) => entry.interviewId === scheduledInterview.id,
    ),
  );

  const managerDashboard = await api(
    `/interviews/admin-dashboard?from=${bounds.periodStart}&to=${bounds.periodEnd}`,
    {},
    'manager',
  );

  assert.equal(managerDashboard.response.status, 200);
  assert.equal(
    managerDashboard.payload.summary.completedCount,
    completedBefore + 1,
  );
  assert.equal(
    managerDashboard.payload.outcomeMix.correctCount +
      managerDashboard.payload.outcomeMix.partialCount +
      managerDashboard.payload.outcomeMix.incorrectCount,
    outcomesBefore + runtime.payload.items.length,
  );
  assert.ok(
    managerDashboard.payload.recentCompleted.some(
      (item) => item.id === scheduledInterview.id,
    ),
  );

  const adminDashboardForbidden = await api(
    `/interviews/admin-dashboard?from=${bounds.periodStart}&to=${bounds.periodEnd}`,
  );

  assert.equal(adminDashboardForbidden.response.status, 403);
});

test('manual pair validations reject duplicate, self-pair and out-of-range date', async () => {
  const participantIds = interviewUsers.slice(0, 2).map((user) => user.id);
  const { cycle } = await createCycle(4, participantIds);
  const existing = cycle.interviews[0];

  const duplicate = await api(`/interviews/cycles/${cycle.id}/pairs`, {
    method: 'POST',
    body: JSON.stringify({
      interviewerId: existing.interviewer.id,
      intervieweeId: existing.interviewee.id,
    }),
  }, 'manager');

  assert.equal(duplicate.response.status, 400);

  const selfPair = await api(`/interviews/cycles/${cycle.id}/pairs`, {
    method: 'POST',
    body: JSON.stringify({
      interviewerId: participantIds[0],
      intervieweeId: participantIds[0],
    }),
  }, 'manager');

  assert.equal(selfPair.response.status, 400);

  const outOfRange = await api(`/interviews/${existing.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plannedDate: weekBounds(10).plannedDate,
    }),
  }, 'manager');

  assert.equal(outOfRange.response.status, 400);
});

test('interview management endpoints are restricted to manager', async () => {
  const participantIds = interviewUsers.slice(0, 2).map((user) => user.id);
  const nextBounds = weekBounds(6);

  const userCreateCycle = await api(
    '/interviews/cycles',
    {
      method: 'POST',
      body: JSON.stringify({
        periodStart: nextBounds.periodStart,
        periodEnd: nextBounds.periodEnd,
        participantIds,
      }),
    },
    interviewUsers[0].id,
  );

  assert.equal(userCreateCycle.response.status, 403);

  const adminCreateCycle = await api('/interviews/cycles', {
    method: 'POST',
    body: JSON.stringify({
      periodStart: nextBounds.periodStart,
      periodEnd: nextBounds.periodEnd,
      participantIds,
    }),
  });

  assert.equal(adminCreateCycle.response.status, 403);

  const { cycle } = await createCycle(7, participantIds);

  const userCalendar = await api(
    `/interviews/admin-calendar?month=${weekBounds(7).plannedDate.slice(0, 7)}`,
    {},
    interviewUsers[0].id,
  );

  assert.equal(userCalendar.response.status, 403);

  const adminCalendar = await api(
    `/interviews/admin-calendar?month=${weekBounds(7).plannedDate.slice(0, 7)}`,
  );

  assert.equal(adminCalendar.response.status, 403);

  const userPair = await api(
    `/interviews/cycles/${cycle.id}/pairs`,
    {
      method: 'POST',
      body: JSON.stringify({
        interviewerId: participantIds[0],
        intervieweeId: participantIds[1],
      }),
    },
    interviewUsers[0].id,
  );

  assert.equal(userPair.response.status, 403);
});
