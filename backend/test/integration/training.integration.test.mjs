import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  apiRequest,
  buildUserCredentials,
  bootstrapAdmin,
  login,
  prepareDatabase,
  startServer,
  stopServer,
} from './support.mjs';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.TEST_BACKEND_PORT || 3102);
const baseUrl = `http://127.0.0.1:${port}/api`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

let serverProcess = null;
let adminToken = '';
let managerToken = '';
let trainerToken = '';
let traineeToken = '';
let trainerUserId = '';
let traineeUserId = '';

async function api(path, options = {}, actor = 'admin') {
  const accessToken =
    actor === 'manager'
      ? managerToken
      : actor === 'trainer'
      ? trainerToken
      : actor === 'trainee'
        ? traineeToken
        : adminToken;
  return apiRequest(baseUrl, path, options, accessToken);
}

async function createTopic(name) {
  const result = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, 'manager');

  assert.equal(result.response.status, 201);
  return result.payload;
}

async function prepareAngularTraining(actor = 'trainer') {
  const presets = await api('/training/presets', {}, actor);
  const angularPreset = presets.payload.find(
    (item) => item.name === 'Angular Developer',
  );

  assert.ok(angularPreset);

  const prepared = await api(
    '/training/prepare',
    {
      method: 'POST',
      body: JSON.stringify({
        topicIds: angularPreset.topics.map((topic) => topic.id),
      }),
    },
    actor,
  );

  assert.equal(prepared.response.status, 200);
  return prepared.payload;
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

  const managerCredentials = buildUserCredentials('training-manager');
  const createdManager = await api(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...managerCredentials,
        role: 'MANAGER',
      }),
    },
    'admin',
  );

  assert.equal(createdManager.response.status, 201);

  const managerLogin = await login(
    baseUrl,
    managerCredentials.login,
    managerCredentials.password,
  );

  assert.equal(managerLogin.response.status, 200);
  managerToken = managerLogin.payload.accessToken;

  const trainerCredentials = buildUserCredentials('training-trainer');
  const createdTrainer = await api(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...trainerCredentials,
        role: 'USER',
      }),
    },
    'admin',
  );

  assert.equal(createdTrainer.response.status, 201);
  trainerUserId = createdTrainer.payload.id;

  const trainerLogin = await login(
    baseUrl,
    trainerCredentials.login,
    trainerCredentials.password,
  );

  assert.equal(trainerLogin.response.status, 200);
  trainerToken = trainerLogin.payload.accessToken;

  const traineeCredentials = buildUserCredentials('training-trainee');
  const createdTrainee = await api(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...traineeCredentials,
        role: 'USER',
      }),
    },
    'admin',
  );

  assert.equal(createdTrainee.response.status, 201);
  traineeUserId = createdTrainee.payload.id;

  const traineeLogin = await login(
    baseUrl,
    traineeCredentials.login,
    traineeCredentials.password,
  );

  assert.equal(traineeLogin.response.status, 200);
  traineeToken = traineeLogin.payload.accessToken;
});

after(async () => {
  await stopServer(serverProcess);
});

test('GET /api/training/presets returns default Angular preset for user', async () => {
  const result = await api('/training/presets', {}, 'trainer');

  assert.equal(result.response.status, 200);
  const angularPreset = result.payload.find(
    (item) => item.name === 'Angular Developer',
  );

  assert.ok(angularPreset);
  assert.deepEqual(
    angularPreset.topics.map((topic) => topic.slug),
    ['javascript', 'typescript', 'angular', 'scss', 'ngrx'],
  );
});

test('training preset CRUD is manager-only', async () => {
  const topicA = await createTopic(`Training Preset Topic A ${Date.now()}`);
  const topicB = await createTopic(`Training Preset Topic B ${Date.now()}`);

  const forbidden = await api(
    '/training/presets',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Forbidden Preset ${Date.now()}`,
        topicIds: [topicA.id],
      }),
    },
    'trainer',
  );

  assert.equal(forbidden.response.status, 403);

  const adminForbidden = await api('/training/presets', {
    method: 'POST',
    body: JSON.stringify({
      name: `Admin Forbidden Preset ${Date.now()}`,
      topicIds: [topicA.id],
    }),
  });

  assert.equal(adminForbidden.response.status, 403);

  const created = await api('/training/presets', {
    method: 'POST',
    body: JSON.stringify({
      name: `Custom Preset ${Date.now()}`,
      topicIds: [topicA.id, topicB.id],
    }),
  }, 'manager');

  assert.equal(created.response.status, 201);
  assert.deepEqual(
    created.payload.topics.map((topic) => topic.id),
    [topicA.id, topicB.id],
  );

  const updated = await api(`/training/presets/${created.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: `${created.payload.name} Updated`,
      topicIds: [topicB.id, topicA.id],
    }),
  }, 'manager');

  assert.equal(updated.response.status, 200);
  assert.deepEqual(
    updated.payload.topics.map((topic) => topic.id),
    [topicB.id, topicA.id],
  );

  const deleted = await api(`/training/presets/${created.payload.id}`, {
    method: 'DELETE',
  }, 'manager');

  assert.equal(deleted.response.status, 204);
});

test('POST /api/training/prepare rejects unknown topicId', async () => {
  const result = await api(
    '/training/prepare',
    {
      method: 'POST',
      body: JSON.stringify({
        topicIds: ['missing-topic-id'],
      }),
    },
    'trainer',
  );

  assert.equal(result.response.status, 400);
});

test('POST /api/training/prepare returns seeded Angular training with sorted difficulties', async () => {
  const prepared = await prepareAngularTraining('trainer');
  assert.ok(prepared.items.length > 0);
  assert.ok(prepared.items.every((item) => typeof item.textContent.text === 'string'));
  assert.ok(prepared.items.every((item) => typeof item.answerContent.text === 'string'));

  const difficulties = prepared.items.map((item) => item.difficulty);
  const sorted = [...difficulties].sort((left, right) => {
    const order = { junior: 0, middle: 1, senior: 2, lead: 3 };
    return order[left] - order[right];
  });

  assert.deepEqual(difficulties, sorted);
});

test('POST /api/training/results persists session for growth analytics', async () => {
  const prepared = await prepareAngularTraining('trainer');
  const firstThree = prepared.items.slice(0, 3);
  const saved = await api(
    '/training/results',
    {
      method: 'POST',
      body: JSON.stringify({
        status: 'COMPLETED',
        items: firstThree.map((item, index) => ({
          questionId: item.id,
          difficulty: item.difficulty,
          topicIds: item.topics.map((topic) => topic.id),
          result:
            index === 0
              ? 'correct'
              : index === 1
                ? 'partial'
                : 'incorrect',
        })),
      }),
    },
    'trainer',
  );

  assert.equal(saved.response.status, 201);

  const growth = await api('/analytics/growth', {}, 'trainer');

  assert.equal(growth.response.status, 200);
  assert.equal(growth.payload.summary.totalResults, 3);
  assert.equal(growth.payload.summary.correctCount, 1);
  assert.equal(growth.payload.summary.incorrectCount, 1);
  assert.equal(growth.payload.summary.partialCount, 1);
  assert.ok(
    growth.payload.failedQuestions.every((item) => typeof item.textContent.text === 'string'),
  );
  assert.ok(
    growth.payload.answeredQuestions.every((item) => typeof item.textContent.text === 'string'),
  );
  assert.ok(growth.payload.failedQuestions.some((item) => item.lastResult === 'partial'));
});

test('self-training still rejects feedback', async () => {
  const prepared = await prepareAngularTraining('trainer');
  const result = await api(
    '/training/results',
    {
      method: 'POST',
      body: JSON.stringify({
        status: 'COMPLETED',
        feedback: 'Этот комментарий не должен сохраниться.',
        items: prepared.items.slice(0, 1).map((item) => ({
          questionId: item.id,
          difficulty: item.difficulty,
          topicIds: item.topics.map((topic) => topic.id),
          result: 'correct',
        })),
      }),
    },
    'trainer',
  );

  assert.equal(result.response.status, 400);
});

test('admin cannot enter user-only training flow', async () => {
  const prepareAttempt = await api('/training/prepare', {
    method: 'POST',
    body: JSON.stringify({
      topicIds: [],
    }),
  });

  assert.equal(prepareAttempt.response.status, 403);

  const saveAttempt = await api('/training/results', {
    method: 'POST',
    body: JSON.stringify({
      targetUserId: traineeUserId,
      feedback: 'Admin feedback should be forbidden.',
      status: 'COMPLETED',
      items: [],
    }),
  });

  assert.equal(saveAttempt.response.status, 403);

  const participantsAttempt = await api('/training/participants');
  assert.equal(participantsAttempt.response.status, 403);
});

test('GET /api/training/participants returns active peers except current user', async () => {
  const result = await api('/training/participants', {}, 'trainer');

  assert.equal(result.response.status, 200);
  assert.ok(Array.isArray(result.payload.items));
  assert.ok(result.payload.items.some((item) => item.id === traineeUserId));
  assert.ok(result.payload.items.every((item) => item.id !== trainerUserId));
});

test('user can save training results for another user with feedback', async () => {
  const prepared = await prepareAngularTraining('trainer');

  const feedback = 'Нужно лучше структурировать ответ и точнее объяснять компромиссы.';
  const result = await api(
    '/training/results',
    {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: traineeUserId,
        feedback,
        status: 'COMPLETED',
        items: prepared.items.slice(0, 1).map((item) => ({
          questionId: item.id,
          difficulty: item.difficulty,
          topicIds: item.topics.map((topic) => topic.id),
          result: 'partial',
        })),
      }),
    },
    'trainer',
  );

  assert.equal(result.response.status, 201);

  const growth = await api('/analytics/growth', {}, 'trainee');

  assert.equal(growth.response.status, 200);
  assert.equal(growth.payload.feedbackEntries[0].feedback, feedback);
  assert.equal(growth.payload.feedbackEntries[0].trainer.id, trainerUserId);
  assert.ok(growth.payload.summary.partialCount >= 1);
});

test('training history is available only for target user', async () => {
  const prepared = await prepareAngularTraining('trainer');
  const feedback = 'Есть прогресс, но аргументация ещё неустойчива.';
  const saved = await api(
    '/training/results',
    {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: traineeUserId,
        feedback,
        status: 'COMPLETED',
        items: prepared.items.slice(0, 2).map((item, index) => ({
          questionId: item.id,
          difficulty: item.difficulty,
          topicIds: item.topics.map((topic) => topic.id),
          result: index === 0 ? 'partial' : 'incorrect',
        })),
      }),
    },
    'trainer',
  );

  assert.equal(saved.response.status, 201);

  const traineeHistory = await api('/training/history', {}, 'trainee');

  assert.equal(traineeHistory.response.status, 200);
  assert.ok(traineeHistory.payload.items.some((item) => item.id === saved.payload.id));

  const trainerHistory = await api('/training/history', {}, 'trainer');

  assert.equal(trainerHistory.response.status, 200);
  assert.ok(trainerHistory.payload.items.every((item) => item.id !== saved.payload.id));

  const detail = await api(`/training/history/${saved.payload.id}`, {}, 'trainee');

  assert.equal(detail.response.status, 200);
  assert.equal(detail.payload.id, saved.payload.id);
  assert.equal(detail.payload.feedback, feedback);
  assert.equal(detail.payload.partialCount, 1);
  assert.equal(detail.payload.results.length, 2);
  assert.equal(detail.payload.results[0].result, 'partial');
  assert.ok(Array.isArray(detail.payload.results[0].topics));

  const foreignDetail = await api(`/training/history/${saved.payload.id}`, {}, 'trainer');

  assert.equal(foreignDetail.response.status, 404);

  const adminDetail = await api(`/training/history/${saved.payload.id}`);

  assert.equal(adminDetail.response.status, 403);
});
