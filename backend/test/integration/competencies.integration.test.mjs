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
const port = Number(process.env.TEST_BACKEND_PORT || 3106);
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

  const managerCredentials = buildUserCredentials('competencies-manager');
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

  const userCredentials = buildUserCredentials('competencies-user');
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

test('manager manages stacks and competencies while user can only read', async () => {
  const stackName = uniqueLabel('Frontend Stack');
  const createdStack = await api('/stacks', {
    method: 'POST',
    body: JSON.stringify({ name: stackName }),
  }, 'manager');

  assert.equal(createdStack.response.status, 201);
  assert.equal(createdStack.payload.name, stackName);
  assert.equal(createdStack.payload.competenciesCount, 0);

  const duplicateStack = await api('/stacks', {
    method: 'POST',
    body: JSON.stringify({ name: stackName }),
  }, 'manager');

  assert.equal(duplicateStack.response.status, 409);

  const createdCompetency = await api('/competencies', {
    method: 'POST',
    body: JSON.stringify({
      stackId: createdStack.payload.id,
      name: uniqueLabel('TypeScript'),
      description: 'Static typing and type-system tradeoffs',
      position: 1,
    }),
  }, 'manager');

  assert.equal(createdCompetency.response.status, 201);
  assert.equal(createdCompetency.payload.stack.id, createdStack.payload.id);
  assert.equal(createdCompetency.payload.position, 1);

  const listedStacks = await api('/stacks?limit=100&offset=0', {}, 'user');

  assert.equal(listedStacks.response.status, 200);
  assert.ok(listedStacks.payload.items.some((item) => item.id === createdStack.payload.id));

  const listedCompetencies = await api(
    `/competencies?stackId=${createdStack.payload.id}&limit=100&offset=0`,
    {},
    'user',
  );

  assert.equal(listedCompetencies.response.status, 200);
  assert.ok(listedCompetencies.payload.items.some((item) => item.id === createdCompetency.payload.id));

  const forbiddenCreate = await api('/stacks', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Forbidden Stack') }),
  }, 'user');

  assert.equal(forbiddenCreate.response.status, 403);
});

test('manager assigns stacks to users through competency matrix', async () => {
  const stack = await api('/stacks', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('Backend Stack') }),
  }, 'manager');

  assert.equal(stack.response.status, 201);

  const credentials = buildUserCredentials('stacked-user');
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...credentials,
      role: 'USER',
    }),
  });

  assert.equal(created.response.status, 201);
  assert.deepEqual(created.payload.stacks, []);

  const adminAssignment = await api(`/competency-matrix/users/${created.payload.id}/stacks`, {
    method: 'PATCH',
    body: JSON.stringify({
      stackIds: [stack.payload.id],
    }),
  });

  assert.equal(adminAssignment.response.status, 403);

  const userAssignment = await api(`/competency-matrix/users/${created.payload.id}/stacks`, {
    method: 'PATCH',
    body: JSON.stringify({
      stackIds: [stack.payload.id],
    }),
  }, 'user');

  assert.equal(userAssignment.response.status, 403);

  const assigned = await api(`/competency-matrix/users/${created.payload.id}/stacks`, {
    method: 'PATCH',
    body: JSON.stringify({
      stackIds: [stack.payload.id],
    }),
  }, 'manager');

  assert.equal(assigned.response.status, 200);
  assert.deepEqual(
    assigned.payload.stacks.map((item) => item.id),
    [stack.payload.id],
  );

  const listed = await api(`/competency-matrix?stackId=${stack.payload.id}`, {}, 'manager');

  assert.equal(listed.response.status, 200);
  assert.ok(listed.payload.items.some((item) => item.user.id === created.payload.id));
  assert.ok(listed.payload.items.every((item) =>
    item.stacks.some((stackItem) => stackItem.id === stack.payload.id),
  ));

  const otherStack = await api('/stacks', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueLabel('QA Stack') }),
  }, 'manager');

  assert.equal(otherStack.response.status, 201);

  const updated = await api(`/competency-matrix/users/${created.payload.id}/stacks`, {
    method: 'PATCH',
    body: JSON.stringify({
      stackIds: [otherStack.payload.id],
    }),
  }, 'manager');

  assert.equal(updated.response.status, 200);
  assert.deepEqual(
    updated.payload.stacks.map((item) => item.id),
    [otherStack.payload.id],
  );
});
