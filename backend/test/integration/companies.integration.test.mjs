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
const port = Number(process.env.TEST_BACKEND_PORT || 3103);
const baseUrl = `http://127.0.0.1:${port}/api`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

let serverProcess = null;
let adminToken = '';
let managerToken = '';
let userToken = '';

function uniqueLabel(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function api(path, options = {}, actor = 'admin') {
  const accessToken =
    actor === 'user'
      ? userToken
      : actor === 'manager'
        ? managerToken
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

  const managerCredentials = buildUserCredentials('companies-manager');
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

  const userCredentials = buildUserCredentials('companies-user');
  const createdUser = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...userCredentials,
      role: 'USER',
    }),
  });

  assert.equal(createdUser.response.status, 201);

  const userLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(userLogin.response.status, 200);
  userToken = userLogin.payload.accessToken;
});

after(async () => {
  await stopServer(serverProcess);
});

test('company CRUD, Lead difficulty and company-aware search work together', async () => {
  const topicName = uniqueLabel('Companies Topic');
  const createdTopic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: topicName }),
  }, 'manager');

  assert.equal(createdTopic.response.status, 201);

  const createdCompany = await api('/companies', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Google') }),
  }, 'manager');

  assert.equal(createdCompany.response.status, 201);
  assert.equal(typeof createdCompany.payload.questionsCount, 'number');
  assert.equal(createdCompany.payload.questionsCount, 0);

  const listedCompanies = await api(
    `/companies?q=${encodeURIComponent(createdCompany.payload.name.slice(0, 6))}&limit=20&offset=0`,
  );

  assert.equal(listedCompanies.response.status, 200);
  assert.ok(listedCompanies.payload.items.some((item) => item.id === createdCompany.payload.id));

  const createdQuestion = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: uniqueLabel('Lead company question') },
      answerContent: { text: 'Lead company answer' },
      difficulty: 'lead',
      topicIds: [createdTopic.payload.id],
      companyId: createdCompany.payload.id,
    }),
  }, 'manager');

  assert.equal(createdQuestion.response.status, 201);
  assert.equal(createdQuestion.payload.difficulty, 'lead');
  assert.equal(createdQuestion.payload.company.id, createdCompany.payload.id);
  assert.equal(createdQuestion.payload.company.name, createdCompany.payload.name);

  const fetchedQuestion = await api(`/questions/${createdQuestion.payload.id}`);

  assert.equal(fetchedQuestion.response.status, 200);
  assert.equal(fetchedQuestion.payload.company.id, createdCompany.payload.id);
  assert.equal(fetchedQuestion.payload.difficulty, 'lead');

  const searchByCompany = await api(
    `/search/questions?companyQuery=${encodeURIComponent(createdCompany.payload.name.slice(0, 6))}&difficulty=lead&limit=20&offset=0`,
  );

  assert.equal(searchByCompany.response.status, 200);
  assert.ok(searchByCompany.payload.items.some((item) => item.id === createdQuestion.payload.id));
  assert.ok(searchByCompany.payload.items.every((item) => item.difficulty === 'lead'));
  assert.equal(
    searchByCompany.payload.meta.appliedFilters.companyQuery,
    createdCompany.payload.name.slice(0, 6),
  );

  const renamedCompanyName = uniqueLabel('Alphabet');
  const renamedCompany = await api(`/companies/${createdCompany.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: renamedCompanyName }),
  }, 'manager');

  assert.equal(renamedCompany.response.status, 200);
  assert.equal(renamedCompany.payload.name, renamedCompanyName);

  const fetchedAfterRename = await api(`/questions/${createdQuestion.payload.id}`);

  assert.equal(fetchedAfterRename.response.status, 200);
  assert.equal(fetchedAfterRename.payload.company.name, renamedCompanyName);

  const updatedQuestion = await api(`/questions/${createdQuestion.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      companyId: null,
    }),
  }, 'manager');

  assert.equal(updatedQuestion.response.status, 200);
  assert.equal(updatedQuestion.payload.company, null);
  assert.equal(updatedQuestion.payload.difficulty, 'lead');
});

test('company endpoints are restricted to manager', async () => {
  const createAttempt = await api(
    '/companies',
    {
      method: 'POST',
      body: JSON.stringify({ name: uniqueLabel('Forbidden company') }),
    },
    'user',
  );

  assert.equal(createAttempt.response.status, 403);

  const adminCreateAttempt = await api('/companies', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Admin forbidden company') }),
  });

  assert.equal(adminCreateAttempt.response.status, 403);

  const company = await api('/companies', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Rename target') }),
  }, 'manager');

  assert.equal(company.response.status, 201);

  const renameAttempt = await api(
    `/companies/${company.payload.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: uniqueLabel('Rename forbidden') }),
    },
    'user',
  );

  assert.equal(renameAttempt.response.status, 403);

  const adminRenameAttempt = await api(`/companies/${company.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: uniqueLabel('Admin rename forbidden') }),
  });

  assert.equal(adminRenameAttempt.response.status, 403);
});

test('question write-side rejects unknown companyId in direct publish and change request', async () => {
  const topic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Unknown company topic') }),
  }, 'manager');

  assert.equal(topic.response.status, 201);

  const directPublish = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: uniqueLabel('Unknown company direct publish') },
      answerContent: { text: 'Unknown company direct publish answer' },
      difficulty: 'lead',
      topicIds: [topic.payload.id],
      companyId: 'missing-company-id',
    }),
  }, 'manager');

  assert.equal(directPublish.response.status, 400);

  const changeRequest = await api(
    '/question-change-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'CREATE',
        payload: {
          textContent: { text: uniqueLabel('Unknown company change request') },
          answerContent: { text: 'Unknown company change request answer' },
          difficulty: 'lead',
          topicIds: [topic.payload.id],
          companyId: 'missing-company-id',
        },
      }),
    },
    'user',
  );

  assert.equal(changeRequest.response.status, 400);
});

test('moderation snapshots include company diff and approve applies company to published question', async () => {
  const topic = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Moderation company topic') }),
  }, 'manager');

  assert.equal(topic.response.status, 201);

  const baseCompany = await api('/companies', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Base company') }),
  }, 'manager');

  assert.equal(baseCompany.response.status, 201);

  const nextCompany = await api('/companies', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Next company') }),
  }, 'manager');

  assert.equal(nextCompany.response.status, 201);

  const question = await api('/questions', {
    method: 'POST',
    body: JSON.stringify({
      textContent: { text: uniqueLabel('Moderation company question') },
      answerContent: { text: 'Moderation company answer' },
      difficulty: 'middle',
      topicIds: [topic.payload.id],
      companyId: baseCompany.payload.id,
    }),
  }, 'manager');

  assert.equal(question.response.status, 201);

  const changeRequest = await api(
    '/question-change-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'UPDATE',
        targetQuestionId: question.payload.id,
        payload: {
          textContent: { text: `${question.payload.text} updated` },
          answerContent: { text: 'Moderation company answer updated' },
          difficulty: 'lead',
          topicIds: [topic.payload.id],
          companyId: nextCompany.payload.id,
        },
      }),
    },
    'user',
  );

  assert.equal(changeRequest.response.status, 201);

  const detail = await api(`/question-change-requests/${changeRequest.payload.id}`, {}, 'manager');

  assert.equal(detail.response.status, 200);
  assert.equal(detail.payload.fieldDiffs.company.changed, true);
  assert.equal(detail.payload.fieldDiffs.company.before.id, baseCompany.payload.id);
  assert.equal(detail.payload.fieldDiffs.company.after.id, nextCompany.payload.id);
  assert.equal(detail.payload.fieldDiffs.difficulty.after, 'lead');

  const approved = await api(
    `/question-change-requests/${changeRequest.payload.id}/approve`,
    {
      method: 'POST',
    },
    'manager',
  );

  assert.equal(approved.response.status, 200);

  const updatedQuestion = await api(`/questions/${question.payload.id}`);

  assert.equal(updatedQuestion.response.status, 200);
  assert.equal(updatedQuestion.payload.company.id, nextCompany.payload.id);
  assert.equal(updatedQuestion.payload.company.name, nextCompany.payload.name);
  assert.equal(updatedQuestion.payload.difficulty, 'lead');
});
