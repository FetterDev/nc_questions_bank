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

async function api(path, options = {}, accessToken = adminToken) {
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
});

after(async () => {
  await stopServer(serverProcess);
});

test('login succeeds for bootstrap admin and GET /api/me requires valid token', async () => {
  const me = await api('/me');
  assert.equal(me.response.status, 200);
  assert.equal(me.payload.login, bootstrapAdmin.login);
  assert.equal(me.payload.role, 'ADMIN');

  const missingToken = await apiRequest(baseUrl, '/me');
  assert.equal(missingToken.response.status, 401);
});

test('manager login succeeds and GET /api/me returns MANAGER role', async () => {
  const managerCredentials = buildUserCredentials('auth-manager');
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...managerCredentials,
      role: 'MANAGER',
    }),
  });

  assert.equal(created.response.status, 201);

  const managerLogin = await login(
    baseUrl,
    managerCredentials.login,
    managerCredentials.password,
  );

  assert.equal(managerLogin.response.status, 200);
  assert.equal(managerLogin.payload.profile.role, 'MANAGER');

  const me = await api('/me', {}, managerLogin.payload.accessToken);
  assert.equal(me.response.status, 200);
  assert.equal(me.payload.role, 'MANAGER');
});

test('login rejects invalid credentials and disabled users', async () => {
  const missing = await login(baseUrl, 'missing-user', 'wrong-password-2026');
  assert.equal(missing.response.status, 401);

  const userCredentials = buildUserCredentials('disabled-user');
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...userCredentials,
      role: 'USER',
    }),
  });

  assert.equal(created.response.status, 201);

  const disabled = await api(`/users/${created.payload.id}/deactivate`, {
    method: 'POST',
  });

  assert.equal(disabled.response.status, 200);

  const disabledLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(disabledLogin.response.status, 401);
});

test('password reset invalidates old token and accepts new password', async () => {
  const userCredentials = buildUserCredentials('reset-user');
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...userCredentials,
      role: 'USER',
    }),
  });

  assert.equal(created.response.status, 201);

  const firstLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(firstLogin.response.status, 200);

  const reset = await api(`/users/${created.payload.id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({
      password: 'changed-password-2026',
    }),
  });

  assert.equal(reset.response.status, 200);

  const staleToken = await api('/me', {}, firstLogin.payload.accessToken);
  assert.equal(staleToken.response.status, 401);

  const secondLogin = await login(
    baseUrl,
    userCredentials.login,
    'changed-password-2026',
  );

  assert.equal(secondLogin.response.status, 200);
});

test('deactivate invalidates current token and activate restores login', async () => {
  const userCredentials = buildUserCredentials('toggle-user');
  const created = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...userCredentials,
      role: 'USER',
    }),
  });

  assert.equal(created.response.status, 201);

  const firstLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(firstLogin.response.status, 200);

  const disabled = await api(`/users/${created.payload.id}/deactivate`, {
    method: 'POST',
  });

  assert.equal(disabled.response.status, 200);

  const staleToken = await api('/me', {}, firstLogin.payload.accessToken);
  assert.equal(staleToken.response.status, 401);

  const disabledLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );
  assert.equal(disabledLogin.response.status, 401);

  const activated = await api(`/users/${created.payload.id}/activate`, {
    method: 'POST',
  });

  assert.equal(activated.response.status, 200);

  const reLogin = await login(
    baseUrl,
    userCredentials.login,
    userCredentials.password,
  );

  assert.equal(reLogin.response.status, 200);
});

test('admin can create ADMIN and guard last active admin invariants', async () => {
  const adminCredentials = buildUserCredentials('second-admin');
  const createdAdmin = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...adminCredentials,
      role: 'ADMIN',
    }),
  });

  assert.equal(createdAdmin.response.status, 201);
  assert.equal(createdAdmin.payload.role, 'ADMIN');

  const secondAdminLogin = await login(
    baseUrl,
    adminCredentials.login,
    adminCredentials.password,
  );

  assert.equal(secondAdminLogin.response.status, 200);

  const selfDeactivate = await api(`/users/${createdAdmin.payload.id}/deactivate`, {
    method: 'POST',
  }, secondAdminLogin.payload.accessToken);
  assert.equal(selfDeactivate.response.status, 403);

  const selfDemote = await api(`/users/${createdAdmin.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'USER' }),
  }, secondAdminLogin.payload.accessToken);
  assert.equal(selfDemote.response.status, 403);

  const disableSecondAdmin = await api(`/users/${createdAdmin.payload.id}/deactivate`, {
    method: 'POST',
  });
  assert.equal(disableSecondAdmin.response.status, 200);

  const bootstrapSelfDeactivate = await api('/users?limit=100&offset=0');
  const bootstrapUser = bootstrapSelfDeactivate.payload.items.find(
    (item) => item.login === bootstrapAdmin.login,
  );

  assert.ok(bootstrapUser);

  const bootstrapDeactivate = await api(`/users/${bootstrapUser.id}/deactivate`, {
    method: 'POST',
  });
  assert.equal(bootstrapDeactivate.response.status, 403);

  const bootstrapDemote = await api(`/users/${bootstrapUser.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'USER' }),
  });
  assert.equal(bootstrapDemote.response.status, 403);
});
