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
const port = Number(process.env.TEST_BACKEND_PORT || 3106);
const baseUrl = `http://127.0.0.1:${port}/api`;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

let serverProcess = null;
let adminToken = '';
let managerToken = '';

async function api(path, options = {}, actor = 'admin') {
  return apiRequest(baseUrl, path, options, actor === 'manager' ? managerToken : adminToken);
}

async function createTopic(name) {
  const result = await api('/topics', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, 'manager');

  assert.equal(result.response.status, 201);
  return result.payload;
}

async function createQuestion(payload) {
  const result = await api('/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'manager');

  assert.equal(result.response.status, 201);
  return result.payload;
}

function textBlock(content) {
  return [{ kind: 'text', content }];
}

function textAndCodeBlocks(content, code, language = 'javascript') {
  return [
    { kind: 'text', content },
    { kind: 'code', content: code, language },
  ];
}

async function uploadCsv(path, content, filename = 'questions.csv') {
  const form = new FormData();
  form.set('file', new Blob([content], { type: 'text/csv' }), filename);

  return api(path, {
    method: 'POST',
    body: form,
  });
}

function escapeCsvCell(value) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n');

  if (
    normalized.includes(';') ||
    normalized.includes('"') ||
    normalized.includes('\n')
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCanonicalCsv(rows) {
  const header = [
    'ID',
    'Темы',
    'Вопрос.Текст',
    'Вопрос.Код',
    'Вопрос.КодЯзык',
    'Ответ.Текст',
    'Ответ.Код',
    'Ответ.КодЯзык',
    'Сложность',
    'Компания',
  ];

  return [
    header.join(';'),
    ...rows.map((row) =>
      [
        row.id ?? '',
        row.topics,
        row.questionText,
        row.questionCode ?? '',
        row.questionCodeLanguage ?? '',
        row.answerText,
        row.answerCode ?? '',
        row.answerCodeLanguage ?? '',
        row.difficulty,
        row.company ?? '',
      ]
        .map((value) => escapeCsvCell(value))
        .join(';'),
    ),
  ].join('\r\n');
}

function parseCsv(content, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    const next = content[index + 1];

    if (current === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && current === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (current === '\n' || current === '\r')) {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];

      if (current === '\r' && next === '\n') {
        index += 1;
      }
      continue;
    }

    field += current;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((cell) => cell.length > 0));
}

before(async () => {
  await prepareDatabase(backendDir, databaseUrl, { seed: false });
  serverProcess = await startServer(backendDir, databaseUrl, port);

  const adminLogin = await login(
    baseUrl,
    bootstrapAdmin.login,
    bootstrapAdmin.password,
  );

  assert.equal(adminLogin.response.status, 200);
  adminToken = adminLogin.payload.accessToken;

  const managerCredentials = buildUserCredentials('questions-csv-manager');
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
});

after(async () => {
  await stopServer(serverProcess);
});

test('GET /api/questions/export returns canonical csv for all filtered rows', async () => {
  const topic = await createTopic(`CSV Export Topic ${Date.now()}`);
  const createdTexts = [];

  for (let index = 0; index < 3; index += 1) {
    const question = await createQuestion({
      textContent: textBlock(`CSV export question ${Date.now()}-${index}`),
      answerContent: textBlock(`CSV export answer ${index}`),
      difficulty: 'middle',
      topicIds: [topic.id],
    });
    createdTexts.push(question.textContent[0].content);
  }

  const exported = await api(
    `/questions/export?topicIds=${encodeURIComponent(topic.id)}&sort=newest`,
  );

  assert.equal(exported.response.status, 200);
  assert.match(
    exported.response.headers.get('content-type') || '',
    /text\/csv/i,
  );

  const rows = parseCsv(String(exported.payload).replace(/^\uFEFF/, ''));

  assert.deepEqual(rows[0], [
    'ID',
    'Темы',
    'Вопрос.Текст',
    'Вопрос.Код',
    'Вопрос.КодЯзык',
    'Ответ.Текст',
    'Ответ.Код',
    'Ответ.КодЯзык',
    'Сложность',
    'Компания',
  ]);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    new Set(rows.slice(1).map((row) => row[2])),
    new Set(createdTexts),
  );
});

test('POST /api/questions/import/preview accepts legacy csv and reports ignored headers', async () => {
  const preview = await uploadCsv(
    '/questions/import/preview',
    [
      'Тема;Вопрос;Ответ;Сложность (1-3);Автор;Контроль;Компания',
      `Legacy Preview Topic ${Date.now()};Legacy preview question;Legacy preview answer;2;Tester;Да;Legacy Preview Company`,
    ].join('\r\n'),
    'legacy-preview.csv',
  );

  assert.equal(preview.response.status, 200);
  assert.equal(preview.payload.applied, false);
  assert.equal(preview.payload.totals.create, 1);
  assert.equal(preview.payload.totals.error, 0);
  assert.ok(preview.payload.warnings.some((warning) => warning.includes('Автор')));
  assert.ok(preview.payload.warnings.some((warning) => warning.includes('Контроль')));
  assert.equal(preview.payload.rows[0].summary, 'create');
  assert.equal(preview.payload.rows[0].normalized.difficulty, 'middle');
  assert.ok(preview.payload.topicsToCreate.length >= 1);
  assert.ok(preview.payload.companiesToCreate.includes('Legacy Preview Company'));
});

test('POST /api/questions/import/preview flags duplicate ids', async () => {
  const topic = await createTopic(`CSV Preview Duplicate Topic ${Date.now()}`);
  const question = await createQuestion({
    textContent: textBlock(`CSV duplicate preview question ${Date.now()}`),
    answerContent: textBlock('CSV duplicate preview answer'),
    difficulty: 'junior',
    topicIds: [topic.id],
  });

  const preview = await uploadCsv(
    '/questions/import/preview',
    buildCanonicalCsv([
      {
        id: question.id,
        topics: topic.name,
        questionText: 'Duplicate preview one',
        answerText: 'Duplicate preview answer one',
        difficulty: 'junior',
      },
      {
        id: question.id,
        topics: topic.name,
        questionText: 'Duplicate preview two',
        answerText: 'Duplicate preview answer two',
        difficulty: 'middle',
      },
    ]),
    'duplicate-id-preview.csv',
  );

  assert.equal(preview.response.status, 200);
  assert.equal(preview.payload.totals.error, 2);
  assert.ok(
    preview.payload.rows.every((row) =>
      row.errors.some((error) => error.includes('дублируется')),
    ),
  );
});

test('POST /api/questions/import/commit updates existing rows and creates new rows with auto-created catalogs', async () => {
  const existingTopic = await createTopic(`CSV Existing Topic ${Date.now()}`);
  const existingQuestion = await createQuestion({
    textContent: textBlock(`CSV commit source ${Date.now()}`),
    answerContent: textBlock('CSV commit source answer'),
    difficulty: 'middle',
    topicIds: [existingTopic.id],
  });
  const nextTopicName = `CSV New Topic ${Date.now()}`;
  const nextCompanyName = `CSV New Company ${Date.now()}`;
  const nextQuestionText = `CSV commit created ${Date.now()}`;

  const committed = await uploadCsv(
    '/questions/import/commit',
    buildCanonicalCsv([
      {
        id: existingQuestion.id,
        topics: `${existingTopic.name}|${nextTopicName}`,
        questionText: 'Updated import question',
        questionCode: 'const questionValue = 1;',
        questionCodeLanguage: 'javascript',
        answerText: 'Updated import answer',
        answerCode: 'return questionValue;',
        answerCodeLanguage: 'javascript',
        difficulty: 'senior',
        company: nextCompanyName,
      },
      {
        id: null,
        topics: nextTopicName,
        questionText: nextQuestionText,
        answerText: 'Created via import',
        difficulty: 'junior',
        company: nextCompanyName,
      },
    ]),
    'commit-success.csv',
  );

  assert.equal(committed.response.status, 200);
  assert.equal(committed.payload.applied, true);
  assert.equal(committed.payload.totals.update, 1);
  assert.equal(committed.payload.totals.create, 1);

  const updatedQuestion = await api(`/questions/${existingQuestion.id}`);
  assert.equal(updatedQuestion.response.status, 200);
  assert.deepEqual(
    updatedQuestion.payload.textContent,
    textAndCodeBlocks('Updated import question', 'const questionValue = 1;'),
  );
  assert.deepEqual(
    updatedQuestion.payload.answerContent,
    textAndCodeBlocks('Updated import answer', 'return questionValue;'),
  );
  assert.equal(updatedQuestion.payload.difficulty, 'senior');
  assert.equal(updatedQuestion.payload.company.name, nextCompanyName);
  assert.deepEqual(
    new Set(updatedQuestion.payload.topics.map((topic) => topic.name)),
    new Set([existingTopic.name, nextTopicName]),
  );

  const createdQuestion = await api(
    `/search/questions?q=${encodeURIComponent(nextQuestionText)}&limit=20&offset=0`,
  );
  assert.equal(createdQuestion.response.status, 200);
  assert.ok(
    createdQuestion.payload.items.some(
      (item) => item.textContent[0]?.content === nextQuestionText,
    ),
  );

  const createdTopic = await api(`/topics?q=${encodeURIComponent(nextTopicName)}`);
  assert.equal(createdTopic.response.status, 200);
  assert.ok(createdTopic.payload.items.some((item) => item.name === nextTopicName));

  const createdCompany = await api(`/companies?q=${encodeURIComponent(nextCompanyName)}`);
  assert.equal(createdCompany.response.status, 200);
  assert.ok(
    createdCompany.payload.items.some((item) => item.name === nextCompanyName),
  );
});

test('POST /api/questions/import/commit rejects invalid csv and keeps db unchanged', async () => {
  const newTopicName = `CSV Invalid Topic ${Date.now()}`;
  const persistedQuestionText = `CSV should not persist ${Date.now()}`;

  const committed = await uploadCsv(
    '/questions/import/commit',
    buildCanonicalCsv([
      {
        id: null,
        topics: newTopicName,
        questionText: persistedQuestionText,
        answerText: 'This row is valid but must be rolled back',
        difficulty: 'middle',
      },
      {
        id: null,
        topics: 'Broken Topic',
        questionText: 'Broken row',
        answerText: 'Broken row answer',
        difficulty: '',
      },
    ]),
    'commit-invalid.csv',
  );

  assert.equal(committed.response.status, 400);
  assert.equal(committed.payload.applied, false);
  assert.ok(committed.payload.totals.error > 0);

  const search = await api(
    `/search/questions?q=${encodeURIComponent(persistedQuestionText)}&limit=20&offset=0`,
  );
  assert.equal(search.response.status, 200);
  assert.equal(search.payload.total, 0);
});
