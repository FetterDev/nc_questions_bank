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
const port = Number(process.env.TEST_BACKEND_PORT || 3101);
const baseUrl = `http://127.0.0.1:${port}/api`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

let serverProcess = null;
let adminToken = '';
let managerToken = '';
let userToken = '';
let secondUserToken = '';

async function api(path, options = {}, actor = 'admin') {
  const accessToken = actor === 'user'
    ? userToken
    : actor === 'manager'
      ? managerToken
    : actor === 'second-user'
      ? secondUserToken
      : adminToken;
  return apiRequest(baseUrl, path, options, accessToken);
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

  const managerCredentials = buildUserCredentials('topics-manager');
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

  const userCredentials = buildUserCredentials('topics-user');
  const createdUser = await api(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...userCredentials,
        role: 'USER',
      }),
    },
    'admin',
  );

  assert.equal(createdUser.response.status, 201);

  const userLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(userLogin.response.status, 200);
  userToken = userLogin.payload.accessToken;

  const secondUserCredentials = buildUserCredentials('topics-second-user');
  const createdSecondUser = await api(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...secondUserCredentials,
        role: 'USER',
      }),
    },
    'admin',
  );

  assert.equal(createdSecondUser.response.status, 201);

  const secondUserLogin = await login(
    baseUrl,
    secondUserCredentials.login,
    secondUserCredentials.password,
  );

  assert.equal(secondUserLogin.response.status, 200);
  secondUserToken = secondUserLogin.payload.accessToken;
});

after(async () => {
  await stopServer(serverProcess);
});

test('GET /api/topics returns deterministic list with counts', async () => {
  const first = await api('/topics?limit=100&offset=0');
  const second = await api('/topics?limit=100&offset=0');

  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.ok(first.payload.total >= 25);
  assert.ok(first.payload.items.length >= 25);
  assert.ok(
    first.payload.items.every((item) => typeof item.questionsCount === 'number'),
  );
  assert.deepEqual(
    first.payload.items.map((item) => item.id),
    second.payload.items.map((item) => item.id),
  );
});

test('GET /api/topics?usedOnly=true hides zero-usage topics', async () => {
  const uniqueName = `Integration Topic ${Date.now()}`;
  const created = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
  }, 'manager');

  assert.equal(created.response.status, 201);

  const listAll = await api(`/topics?q=${encodeURIComponent(uniqueName)}`);
  assert.equal(listAll.response.status, 200);
  assert.equal(listAll.payload.items[0].id, created.payload.id);

  const listUsed = await api(
    `/topics?usedOnly=true&q=${encodeURIComponent(uniqueName)}`,
  );
  assert.equal(listUsed.response.status, 200);
  assert.equal(listUsed.payload.total, 0);
});

test('POST /api/topics is restricted to manager', async () => {
  const result = await api(
    '/topics',
    {
      method: 'POST',
      body: JSON.stringify({ name: `User Forbidden ${Date.now()}` }),
    },
    'user',
  );

  assert.equal(result.response.status, 403);

  const adminAttempt = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: `Admin Forbidden ${Date.now()}` }),
  });

  assert.equal(adminAttempt.response.status, 403);
});

test('PATCH /api/topics renames topic', async () => {
  const uniqueName = `Rename Source ${Date.now()}`;
  const created = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
  }, 'manager');
  const renamed = await api(`/topics/${created.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: `${uniqueName} Final` }),
  }, 'manager');

  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.payload.name, `${uniqueName} Final`);
  assert.equal(
    renamed.payload.slug,
    `${uniqueName} Final`
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''),
  );
});

test('question write-side rejects unknown topicId', async () => {
  const result = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: 'Invalid topic direct publish' },
      answerContent: { text: 'Invalid topic direct publish answer' },
      difficulty: 'middle',
      topicIds: ['missing-topic-id'],
    }),
  }, 'manager');

  assert.equal(result.response.status, 400);
});

test('published question write-side and moderation are restricted to manager', async () => {
  const topic = await api(
    '/topics',
    {
      method: 'POST',
      body: JSON.stringify({ name: `Question Restriction Topic ${Date.now()}` }),
    },
    'manager',
  );

  assert.equal(topic.response.status, 201);

  const userCreate = await api(
    '/questions',
    {
      method: 'POST',
      body: JSON.stringify({
        textContent: { text: `User forbidden question ${Date.now()}` },
        answerContent: { text: 'User forbidden question answer' },
        difficulty: 'middle',
        topicIds: [topic.payload.id],
      }),
    },
    'user',
  );

  assert.equal(userCreate.response.status, 403);

  const adminCreate = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: `Admin forbidden question ${Date.now()}` },
      answerContent: { text: 'Admin forbidden question answer' },
      difficulty: 'middle',
      topicIds: [topic.payload.id],
    }),
  });

  assert.equal(adminCreate.response.status, 403);

  const created = await api(
    '/questions',
    {
      method: 'POST',
      body: JSON.stringify({
        textContent: { text: `Manager published question ${Date.now()}` },
        answerContent: { text: 'Manager published question answer' },
        difficulty: 'middle',
        topicIds: [topic.payload.id],
      }),
    },
    'manager',
  );

  assert.equal(created.response.status, 201);

  const userUpdate = await api(
    `/questions/${created.payload.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        textContent: { text: `${created.payload.text} user update` },
      }),
    },
    'user',
  );

  assert.equal(userUpdate.response.status, 403);

  const adminUpdate = await api(`/questions/${created.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      textContent: { text: `${created.payload.text} admin update` },
    }),
  });

  assert.equal(adminUpdate.response.status, 403);

  const request = await api(
    '/question-change-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'UPDATE',
        targetQuestionId: created.payload.id,
        payload: {
          textContent: { text: `${created.payload.text} reviewed` },
          answerContent: { text: 'Reviewed answer' },
          difficulty: 'senior',
          topicIds: [topic.payload.id],
        },
      }),
    },
    'user',
  );

  assert.equal(request.response.status, 201);

  const adminDetail = await api(`/question-change-requests/${request.payload.id}`);
  assert.equal(adminDetail.response.status, 403);

  const adminApprove = await api(`/question-change-requests/${request.payload.id}/approve`, {
    method: 'POST',
  });

  assert.equal(adminApprove.response.status, 403);
});

test('change request write-side rejects unknown topicId', async () => {
  const result = await api(
    '/question-change-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'CREATE',
        payload: {
          textContent: { text: 'Invalid topic change request' },
          answerContent: { text: 'Invalid topic change request answer' },
          difficulty: 'middle',
          topicIds: ['missing-topic-id'],
        },
      }),
    },
    'user',
  );

  assert.equal(result.response.status, 400);
});

test('search by multiple topicIds uses OR semantics', async () => {
  const topicsResponse = await api('/topics?usedOnly=true&limit=100&offset=0');
  const reactTopic = topicsResponse.payload.items.find(
    (topic) => topic.slug === 'react',
  );
  const typeScriptTopic = topicsResponse.payload.items.find(
    (topic) => topic.slug === 'typescript',
  );

  assert.ok(reactTopic);
  assert.ok(typeScriptTopic);

  const search = await api(
    `/search/questions?topicIds=${reactTopic.id}&topicIds=${typeScriptTopic.id}&limit=100&offset=0`,
  );

  assert.equal(search.response.status, 200);
  assert.ok(search.payload.total > 0);
  assert.ok(
    search.payload.items.every((item) =>
      item.topics.some(
        (topic) => topic.id === reactTopic.id || topic.id === typeScriptTopic.id,
      ),
    ),
  );
});

test('interview encounter mark/unmark is idempotent and enriches read models', async () => {
  const topic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: `Interview Encounters ${Date.now()}` }),
  }, 'manager');

  assert.equal(topic.response.status, 201);

  const question = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: `Encounter question ${Date.now()}` },
      answerContent: { text: 'Encounter answer' },
      difficulty: 'middle',
      topicIds: [topic.payload.id],
    }),
  }, 'manager');

  assert.equal(question.response.status, 201);
  assert.deepEqual(question.payload.interviewEncounter, {
    count: 0,
    checkedByCurrentUser: false,
  });

  const firstMark = await api(
    `/questions/${question.payload.id}/interview-encounter`,
    { method: 'PUT' },
    'user',
  );

  assert.equal(firstMark.response.status, 200);
  assert.deepEqual(firstMark.payload, {
    count: 1,
    checkedByCurrentUser: true,
  });

  const repeatedMark = await api(
    `/questions/${question.payload.id}/interview-encounter`,
    { method: 'PUT' },
    'user',
  );

  assert.equal(repeatedMark.response.status, 200);
  assert.deepEqual(repeatedMark.payload, {
    count: 1,
    checkedByCurrentUser: true,
  });

  const secondUserMark = await api(
    `/questions/${question.payload.id}/interview-encounter`,
    { method: 'PUT' },
    'second-user',
  );

  assert.equal(secondUserMark.response.status, 200);
  assert.deepEqual(secondUserMark.payload, {
    count: 2,
    checkedByCurrentUser: true,
  });

  const fetchedByFirstUser = await api(`/questions/${question.payload.id}`, {}, 'user');

  assert.equal(fetchedByFirstUser.response.status, 200);
  assert.deepEqual(fetchedByFirstUser.payload.interviewEncounter, {
    count: 2,
    checkedByCurrentUser: true,
  });

  const searchByFirstUser = await api(
    `/search/questions?q=${encodeURIComponent(question.payload.text)}&limit=20&offset=0`,
    {},
    'user',
  );

  assert.equal(searchByFirstUser.response.status, 200);
  const searchedQuestion = searchByFirstUser.payload.items.find(
    (item) => item.id === question.payload.id,
  );
  assert.ok(searchedQuestion);
  assert.deepEqual(searchedQuestion.interviewEncounter, {
    count: 2,
    checkedByCurrentUser: true,
  });

  const unmark = await api(
    `/questions/${question.payload.id}/interview-encounter`,
    { method: 'DELETE' },
    'user',
  );

  assert.equal(unmark.response.status, 200);
  assert.deepEqual(unmark.payload, {
    count: 1,
    checkedByCurrentUser: false,
  });

  const repeatedUnmark = await api(
    `/questions/${question.payload.id}/interview-encounter`,
    { method: 'DELETE' },
    'user',
  );

  assert.equal(repeatedUnmark.response.status, 200);
  assert.deepEqual(repeatedUnmark.payload, {
    count: 1,
    checkedByCurrentUser: false,
  });

  const fetchedBySecondUser = await api(
    `/questions/${question.payload.id}`,
    {},
    'second-user',
  );

  assert.equal(fetchedBySecondUser.response.status, 200);
  assert.deepEqual(fetchedBySecondUser.payload.interviewEncounter, {
    count: 1,
    checkedByCurrentUser: true,
  });
});

test('question create/get/search return structured text with optional code', async () => {
  const topic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: `Code Blocks ${Date.now()}` }),
  }, 'manager');

  assert.equal(topic.response.status, 201);

  const created = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: {
        text: 'Что произойдет при выполнении этого кода?',
        code: 'const profile = loadUserProfile(userId);',
        codeLanguage: 'typescript',
      },
      answerContent: {
        text: 'Пока нет вывода в консоль.',
        code: 'console.log(profile);',
        codeLanguage: 'typescript',
      },
      difficulty: 'middle',
      topicIds: [topic.payload.id],
    }),
  }, 'manager');

  assert.equal(created.response.status, 201);
  assert.equal(created.payload.textContent.codeLanguage, 'typescript');
  assert.equal(created.payload.textContent.code, 'const profile = loadUserProfile(userId);');
  assert.match(created.payload.text, /loadUserProfile/);

  const fetched = await api(`/questions/${created.payload.id}`, {}, 'user');

  assert.equal(fetched.response.status, 200);
  assert.equal(fetched.payload.answerContent.codeLanguage, 'typescript');
  assert.equal(fetched.payload.answerContent.code, 'console.log(profile);');

  const search = await api(
    `/search/questions?q=${encodeURIComponent('loadUserProfile')}&limit=50&offset=0`,
    {},
    'user',
  );

  assert.equal(search.response.status, 200);
  assert.ok(
    search.payload.items.some((item) =>
      item.textContent.code?.includes('loadUserProfile'),
    ),
  );
});

test('moderation approve persists updated structured content', async () => {
  const topic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: `Moderation Blocks ${Date.now()}` }),
  }, 'manager');

  assert.equal(topic.response.status, 201);

  const created = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: 'Базовый вопрос для moderation.' },
      answerContent: { text: 'Базовый ответ.' },
      difficulty: 'junior',
      topicIds: [topic.payload.id],
    }),
  }, 'manager');

  assert.equal(created.response.status, 201);

  const request = await api(
    '/question-change-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'UPDATE',
        targetQuestionId: created.payload.id,
        payload: {
          textContent: {
            text: 'Обновленный вопрос для moderation.',
            code: 'const difficulty = 2 as const;',
            codeLanguage: 'typescript',
          },
          answerContent: {
            text: 'Нужно объяснить код и результат.',
          },
          difficulty: 'senior',
          topicIds: [topic.payload.id],
        },
      }),
    },
    'user',
  );

  assert.equal(request.response.status, 201);
  assert.equal(request.payload.after.textContent.codeLanguage, 'typescript');

  const approved = await api(
    `/question-change-requests/${request.payload.id}/approve`,
    { method: 'POST' },
    'manager',
  );

  assert.equal(approved.response.status, 200);
  assert.equal(approved.payload.after.textContent.code, 'const difficulty = 2 as const;');

  const fetched = await api(`/questions/${created.payload.id}`, {}, 'user');

  assert.equal(fetched.response.status, 200);
  assert.equal(fetched.payload.difficulty, 'senior');
  assert.equal(fetched.payload.textContent.code, 'const difficulty = 2 as const;');
});
