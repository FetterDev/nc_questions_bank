import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

export const bootstrapAdmin = {
  login: 'nord.admin',
  password: 'admin-password-2026',
  displayName: 'Nord Admin',
  email: 'nord.admin@example.com',
};

export const authEnv = {
  JWT_SECRET: 'integration-jwt-secret',
  JWT_TTL_HOURS: '8',
  BOOTSTRAP_ADMIN_LOGIN: bootstrapAdmin.login,
  BOOTSTRAP_ADMIN_PASSWORD: bootstrapAdmin.password,
  BOOTSTRAP_ADMIN_DISPLAY_NAME: bootstrapAdmin.displayName,
  BOOTSTRAP_ADMIN_EMAIL: bootstrapAdmin.email,
  BOOTSTRAP_ADMIN_FORCE_UPDATE: 'true',
};

const fallbackTestUserProfiles = [
  { loginBase: 'ivan.petrov', displayName: 'Ivan Petrov' },
  { loginBase: 'anna.smirnova', displayName: 'Anna Smirnova' },
  { loginBase: 'sergey.ivanov', displayName: 'Sergey Ivanov' },
  { loginBase: 'elena.popova', displayName: 'Elena Popova' },
  { loginBase: 'pavel.sokolov', displayName: 'Pavel Sokolov' },
  { loginBase: 'irina.volkova', displayName: 'Irina Volkova' },
];

const namedTestUserProfiles = {
  'companies-user': { loginBase: 'elena.popova', displayName: 'Elena Popova' },
  'disabled-user': { loginBase: 'pavel.sokolov', displayName: 'Pavel Sokolov' },
  'interview-alpha': { loginBase: 'dmitry.kozlov', displayName: 'Dmitry Kozlov' },
  'interview-beta': { loginBase: 'sergey.novikov', displayName: 'Sergey Novikov' },
  'interview-gamma': { loginBase: 'irina.lebedeva', displayName: 'Irina Lebedeva' },
  'reset-user': { loginBase: 'alexey.morozov', displayName: 'Alexey Morozov' },
  'second-admin': { loginBase: 'boris.orlov', displayName: 'Boris Orlov' },
  'toggle-user': { loginBase: 'nikita.volkov', displayName: 'Nikita Volkov' },
  'topics-second-user': { loginBase: 'maria.kuznetsova', displayName: 'Maria Kuznetsova' },
  'topics-user': { loginBase: 'oleg.ivanov', displayName: 'Oleg Ivanov' },
  'training-trainer': { loginBase: 'ivan.petrov', displayName: 'Ivan Petrov' },
  'training-trainee': { loginBase: 'anna.smirnova', displayName: 'Anna Smirnova' },
};

function hashText(value) {
  return Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
}

function resolveTestUserProfile(prefix) {
  const exactProfile = namedTestUserProfiles[prefix];

  if (exactProfile) {
    return exactProfile;
  }

  return fallbackTestUserProfiles[hashText(prefix) % fallbackTestUserProfiles.length];
}

function buildShortSuffix() {
  const timePart = Date.now().toString(36).slice(-4);
  const randomPart = Math.random().toString(36).slice(2, 4);

  return `${timePart}${randomPart}`;
}

export function buildUserCredentials(prefix) {
  const profile = resolveTestUserProfile(prefix);
  const login = `${profile.loginBase}-${buildShortSuffix()}`.slice(0, 64);

  return {
    login,
    password: 'user-password-2026',
    displayName: profile.displayName,
    email: `${login}@example.com`,
  };
}

export function runCommand(command, args, backendDir, databaseUrl, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        ...authEnv,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${args.join(' ')} failed with code ${code}\n${stdout}\n${stderr}`,
        ),
      );
    });
  });
}

export async function prepareDatabase(backendDir, databaseUrl, { seed = true } = {}) {
  await runCommand('npm', ['run', 'prisma:migrate:deploy'], backendDir, databaseUrl);
  await runCommand('npm', ['run', 'bootstrap:admin'], backendDir, databaseUrl);

  if (seed) {
    await runCommand('npm', ['run', 'seed:question-bank'], backendDir, databaseUrl);
  }
}

export async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);

      if (response.ok) {
        return;
      }
    } catch {}

    await delay(500);
  }

  throw new Error('Backend did not become healthy in time');
}

export async function startServer(backendDir, databaseUrl, port) {
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const serverProcess = spawn('node', ['dist/src/main.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(port),
      FRONTEND_ORIGIN: '*',
      ...authEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  await waitForHealth(baseUrl);
  return serverProcess;
}

export async function stopServer(serverProcess) {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await once(serverProcess, 'exit').catch(() => undefined);
}

export async function apiRequest(baseUrl, path, options = {}, accessToken) {
  const headers = new Headers(options.headers ?? {});

  if (
    options.body &&
    !headers.has('content-type') &&
    !(options.body instanceof FormData)
  ) {
    headers.set('content-type', 'application/json');
  }

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    response,
    payload,
  };
}

export async function login(baseUrl, loginValue, password) {
  return apiRequest(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: loginValue,
      password,
    }),
  });
}
