import { chromium, devices } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const NOW_ISO = '2026-03-07T12:00:00.000Z';

const topicCatalog = [
  { id: 'topic-postgres', name: 'PostgreSQL', slug: 'postgresql', questionsCount: 18 },
  { id: 'topic-search', name: 'Search', slug: 'search', questionsCount: 9 },
  { id: 'topic-nest', name: 'NestJS', slug: 'nestjs', questionsCount: 11 },
  { id: 'topic-prisma', name: 'Prisma', slug: 'prisma', questionsCount: 7 },
  { id: 'topic-sql', name: 'SQL', slug: 'sql', questionsCount: 14 },
  { id: 'topic-perf', name: 'Performance', slug: 'performance', questionsCount: 6 },
];

const questionTopics = (ids) =>
  ids.map((id) => {
    const topic = topicCatalog.find((item) => item.id === id);
    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
    };
  });

const snapshotTopics = (ids) =>
  ids.map((id) => {
    const topic = topicCatalog.find((item) => item.id === id);
    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
    };
  });

const content = (text, code, codeLanguage) => ({
  text,
  ...(code ? { code } : {}),
  ...(code && codeLanguage ? { codeLanguage } : {}),
});

const adminProfile = {
  id: 'user-admin',
  email: 'nord.admin@nord.local',
  displayName: 'Nord Admin',
  role: 'ADMIN',
};

const userProfile = {
  id: 'user-growth',
  email: 'nord.user@nord.local',
  displayName: 'Nord User',
  role: 'USER',
};

const reviewAuthor = {
  id: 'user-editor',
  email: 'editor@nord.local',
  displayName: 'Nord Editor',
  role: 'USER',
};

const questions = [
  {
    id: 'question-postgres-indexes',
    text: 'Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?',
    textContent: content('Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?'),
    answer: 'Когда запрос стабильно использует один и тот же префикс where/order by и без него план уходит в seq scan или filesort.',
    answerContent: content('Когда запрос стабильно использует один и тот же префикс where/order by и без него план уходит в seq scan или filesort.'),
    difficulty: 'middle',
    topics: questionTopics(['topic-postgres', 'topic-perf', 'topic-sql']),
    createdAt: '2026-03-05T08:30:00.000Z',
    updatedAt: '2026-03-06T11:10:00.000Z',
    pendingChangeRequest: {
      hasPendingChangeRequest: false,
      hasMyPendingChangeRequest: false,
    },
    interviewEncounter: {
      count: 7,
      checkedByCurrentUser: false,
    },
  },
  {
    id: 'question-prisma-search',
    text: 'Почему сложный поиск в сервисе нельзя оставлять на Prisma query builder?',
    textContent: content(
      'Почему сложный поиск в сервисе нельзя оставлять на Prisma query builder?',
      'const results = await prisma.question.findMany({ where, orderBy });',
      'typescript',
    ),
    answer: 'Потому что ранжирование, FTS, similarity и explainable ordering должны жить в SearchRepository на raw SQL.',
    answerContent: content('Потому что ранжирование, FTS, similarity и explainable ordering должны жить в SearchRepository на raw SQL.'),
    difficulty: 'senior',
    topics: questionTopics(['topic-prisma', 'topic-search', 'topic-nest']),
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-06T09:40:00.000Z',
    pendingChangeRequest: {
      hasPendingChangeRequest: true,
      hasMyPendingChangeRequest: false,
    },
    interviewEncounter: {
      count: 11,
      checkedByCurrentUser: true,
    },
  },
  {
    id: 'question-nest-transactions',
    text: 'Что запрещено делать внутри prisma.$transaction в бизнес-сервисе?',
    textContent: content(
      'Что запрещено делать внутри prisma.$transaction в бизнес-сервисе?',
      'await prisma.$transaction(async (tx) => {\n  await fetch(externalUrl);\n});',
      'typescript',
    ),
    answer: 'Внешние сетевые вызовы. Транзакция должна закрываться локально и быстро.',
    answerContent: content('Внешние сетевые вызовы. Транзакция должна закрываться локально и быстро.'),
    difficulty: 'junior',
    topics: questionTopics(['topic-nest', 'topic-prisma']),
    createdAt: '2026-03-02T09:15:00.000Z',
    updatedAt: '2026-03-05T14:05:00.000Z',
    pendingChangeRequest: {
      hasPendingChangeRequest: false,
      hasMyPendingChangeRequest: false,
    },
    interviewEncounter: {
      count: 3,
      checkedByCurrentUser: false,
    },
  },
];

const trainingPresets = [
  {
    id: 'preset-backend-core',
    name: 'Backend Core',
    topics: snapshotTopics(['topic-postgres', 'topic-prisma', 'topic-search']),
    createdAt: '2026-03-06T08:00:00.000Z',
    updatedAt: '2026-03-06T08:00:00.000Z',
  },
];

const preparedTraining = {
  items: [
    {
      id: 'training-card-1',
      text: 'Когда нужен составной индекс под where + order by?',
      textContent: content('Когда нужен составной индекс под where + order by?'),
      answer: 'Когда префикс полей стабилен, а без индекса план деградирует в seq scan и сортировку.',
      answerContent: content('Когда префикс полей стабилен, а без индекса план деградирует в seq scan и сортировку.'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-postgres', 'topic-sql']),
      assignedTopic: snapshotTopics(['topic-postgres'])[0],
    },
    {
      id: 'training-card-2',
      text: 'Почему FTS и ранжирование нужно держать в repository на raw SQL?',
      textContent: content(
        'Почему FTS и ранжирование нужно держать в repository на raw SQL?',
        'const rank = tsRankCd(searchVector, query);',
        'typescript',
      ),
      answer: 'Потому что relevance, explainable ordering и индексы должны управляться явно и детерминированно.',
      answerContent: content('Потому что relevance, explainable ordering и индексы должны управляться явно и детерминированно.'),
      difficulty: 'senior',
      topics: snapshotTopics(['topic-search', 'topic-prisma']),
      assignedTopic: snapshotTopics(['topic-search'])[0],
    },
    {
      id: 'training-card-3',
      text: 'Что нельзя делать внутри prisma.$transaction?',
      textContent: content('Что нельзя делать внутри prisma.$transaction?'),
      answer: 'Нельзя вызывать внешние сервисы. Транзакция должна оставаться короткой и локальной.',
      answerContent: content('Нельзя вызывать внешние сервисы. Транзакция должна оставаться короткой и локальной.'),
      difficulty: 'junior',
      topics: snapshotTopics(['topic-prisma', 'topic-nest']),
      assignedTopic: snapshotTopics(['topic-prisma'])[0],
    },
  ],
  total: 3,
  meta: {
    tookMs: 13,
    requestedPerTopic: 5,
    topicBreakdown: [
      {
        topic: snapshotTopics(['topic-postgres'])[0],
        availableCount: 7,
        selectedCount: 1,
      },
      {
        topic: snapshotTopics(['topic-prisma'])[0],
        availableCount: 4,
        selectedCount: 1,
      },
      {
        topic: snapshotTopics(['topic-search'])[0],
        availableCount: 3,
        selectedCount: 1,
      },
    ],
  },
};

const growthAnalytics = {
  summary: {
    totalResults: 18,
    correctCount: 9,
    incorrectCount: 9,
    accuracy: 50,
  },
  weakTopics: [
    {
      topicId: 'topic-search',
      name: 'Search',
      slug: 'search',
      correctCount: 1,
      incorrectCount: 5,
      accuracy: 17,
    },
    {
      topicId: 'topic-prisma',
      name: 'Prisma',
      slug: 'prisma',
      correctCount: 3,
      incorrectCount: 4,
      accuracy: 43,
    },
    {
      topicId: 'topic-postgres',
      name: 'PostgreSQL',
      slug: 'postgresql',
      correctCount: 5,
      incorrectCount: 3,
      accuracy: 63,
    },
  ],
  failedQuestions: [
    {
      questionId: 'growth-failed-search',
      text: 'Как стабилизировать пагинацию search endpoint?',
      textContent: content(
        'Как стабилизировать пагинацию search endpoint?',
        'items.sort((left, right) => right.rank - left.rank || right.id.localeCompare(left.id));',
        'typescript',
      ),
      difficulty: 'senior',
      topics: snapshotTopics(['topic-search', 'topic-sql']),
      correctCount: 0,
      incorrectCount: 4,
      lastAnsweredAt: '2026-03-07T11:54:00.000Z',
    },
    {
      questionId: 'growth-failed-prisma',
      text: 'Почему similarity-фильтры не должны жить в controller?',
      textContent: content('Почему similarity-фильтры не должны жить в controller?'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-prisma', 'topic-search']),
      correctCount: 1,
      incorrectCount: 3,
      lastAnsweredAt: '2026-03-07T11:40:00.000Z',
    },
  ],
  answeredQuestions: [
    {
      questionId: 'growth-answered-transaction',
      text: 'Что запрещено делать внутри prisma.$transaction?',
      textContent: content('Что запрещено делать внутри prisma.$transaction?'),
      difficulty: 'junior',
      topics: snapshotTopics(['topic-prisma', 'topic-nest']),
      correctCount: 4,
      incorrectCount: 1,
      lastAnsweredAt: '2026-03-07T10:52:00.000Z',
    },
    {
      questionId: 'growth-answered-index',
      text: 'Когда нужен составной индекс под where + order by?',
      textContent: content('Когда нужен составной индекс под where + order by?'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-postgres', 'topic-sql']),
      correctCount: 3,
      incorrectCount: 2,
      lastAnsweredAt: '2026-03-07T10:11:00.000Z',
    },
  ],
};

const bankAnalytics = {
  totalQuestions: 57,
  dominantDifficulty: 'middle',
  difficultyMix: [
    { difficulty: 'junior', count: 18, share: 32 },
    { difficulty: 'middle', count: 27, share: 47 },
    { difficulty: 'senior', count: 12, share: 21 },
  ],
  topTopics: [
    { topicId: 'topic-postgres', name: 'PostgreSQL', slug: 'postgresql', count: 18 },
    { topicId: 'topic-sql', name: 'SQL', slug: 'sql', count: 14 },
    { topicId: 'topic-nest', name: 'NestJS', slug: 'nestjs', count: 11 },
    { topicId: 'topic-search', name: 'Search', slug: 'search', count: 9 },
    { topicId: 'topic-prisma', name: 'Prisma', slug: 'prisma', count: 7 },
  ],
  sparseTopics: [
    { topicId: 'topic-perf', name: 'Performance', slug: 'performance', count: 2 },
  ],
};

const reviewDetail = {
  id: 'request-update-postgres',
  type: 'UPDATE',
  status: 'PENDING',
  targetQuestionId: 'question-postgres-indexes',
  subject: 'Индексы для фильтрации и сортировки',
  author: reviewAuthor,
  reviewer: null,
  reviewComment: null,
  createdAt: '2026-03-06T12:10:00.000Z',
  updatedAt: '2026-03-06T12:10:00.000Z',
  reviewedAt: null,
  before: {
    text: 'Когда в PostgreSQL достаточно одного индекса?',
    textContent: content('Когда в PostgreSQL достаточно одного индекса?'),
    answer: 'Когда хватает селективности и planner не уходит в seq scan.',
    answerContent: content('Когда хватает селективности и planner не уходит в seq scan.'),
    difficulty: 'middle',
    topics: snapshotTopics(['topic-postgres', 'topic-sql']),
  },
  after: {
    text: 'Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?',
    textContent: content(
      'Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?',
      'const index = [\'difficulty\', \'id\'] as const;',
      'typescript',
    ),
    answer: 'Когда where/order by используют устойчивый префикс и это снимает лишний seq scan.',
    answerContent: content('Когда where/order by используют устойчивый префикс и это снимает лишний seq scan.'),
    difficulty: 'senior',
    topics: snapshotTopics(['topic-postgres', 'topic-sql', 'topic-perf']),
  },
  fieldDiffs: {
    text: {
      changed: true,
      before: 'Когда в PostgreSQL достаточно одного индекса?',
      after: 'Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?',
    },
    answer: {
      changed: true,
      before: 'Когда хватает селективности и planner не уходит в seq scan.',
      after: 'Когда where/order by используют устойчивый префикс и это снимает лишний seq scan.',
    },
    difficulty: {
      changed: true,
      before: 'middle',
      after: 'senior',
    },
    topics: {
      changed: true,
      before: snapshotTopics(['topic-postgres', 'topic-sql']),
      after: snapshotTopics(['topic-postgres', 'topic-sql', 'topic-perf']),
      added: snapshotTopics(['topic-perf']),
      removed: [],
    },
  },
};

const reviewQueue = [
  {
    id: reviewDetail.id,
    type: reviewDetail.type,
    status: reviewDetail.status,
    targetQuestionId: reviewDetail.targetQuestionId,
    subject: reviewDetail.subject,
    author: reviewDetail.author,
    reviewer: reviewDetail.reviewer,
    reviewComment: reviewDetail.reviewComment,
    createdAt: reviewDetail.createdAt,
    updatedAt: reviewDetail.updatedAt,
    reviewedAt: reviewDetail.reviewedAt,
  },
  {
    id: 'request-create-search',
    type: 'CREATE',
    status: 'PENDING',
    targetQuestionId: null,
    subject: 'Ранжирование search endpoint',
    author: {
      id: 'user-analyst',
      email: 'analyst@nord.local',
      displayName: 'Nord Analyst',
      role: 'USER',
    },
    reviewer: null,
    reviewComment: null,
    createdAt: '2026-03-05T16:22:00.000Z',
    updatedAt: '2026-03-05T16:22:00.000Z',
    reviewedAt: null,
  },
];

function resolveActor(scenario) {
  if (scenario === 'growth-user' || scenario === 'training-active' || scenario === 'training-exit') {
    return 'user';
  }

  return 'admin';
}

function profileByActor(actor) {
  return actor === 'user' ? userProfile : adminProfile;
}

export const snapshotViewports = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 1200 },
  },
  {
    name: 'mobile',
    viewport: devices['iPhone 13'].viewport,
    userAgent: devices['iPhone 13'].userAgent,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    isMobile: devices['iPhone 13'].isMobile,
    hasTouch: devices['iPhone 13'].hasTouch,
  },
];

export const snapshotCases = [
  {
    name: 'bank',
    path: '/bank',
    scenario: 'bank',
  },
  {
    name: 'editor-edit',
    path: '/editor/question-postgres-indexes',
    scenario: 'editor-edit',
  },
  {
    name: 'review-filled',
    path: '/review',
    scenario: 'review-filled',
  },
  {
    name: 'review-empty',
    path: '/review?uiSnap=empty',
    scenario: 'review-empty',
  },
  {
    name: 'account',
    path: '/account',
    scenario: 'account',
  },
  {
    name: 'training-active',
    path: '/training',
    scenario: 'training-active',
  },
  {
    name: 'training-exit',
    path: '/training',
    scenario: 'training-exit',
  },
  {
    name: 'growth-user',
    path: '/growth-card',
    scenario: 'growth-user',
  },
  {
    name: 'bank-analysis',
    path: '/bank-analysis',
    scenario: 'bank-analysis',
  },
];

function json(data, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  };
}

function pickReviewDetail(id) {
  if (id === reviewDetail.id) {
    return reviewDetail;
  }

  return {
    ...reviewDetail,
    id,
    subject: 'Новая search-заявка',
    type: 'CREATE',
    targetQuestionId: null,
    author: reviewQueue[1].author,
    before: null,
    after: {
      text: 'Как стабилизировать пагинацию в search endpoint?',
      textContent: content(
        'Как стабилизировать пагинацию в search endpoint?',
        'items.sort((left, right) => right.score - left.score || right.id.localeCompare(left.id));',
        'typescript',
      ),
      answer: 'Нужен deterministic order с tie-breaker, например score desc, id desc.',
      answerContent: content('Нужен deterministic order с tie-breaker, например score desc, id desc.'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-search', 'topic-sql']),
    },
    fieldDiffs: {
      text: { changed: true, before: null, after: 'Как стабилизировать пагинацию в search endpoint?' },
      answer: { changed: true, before: null, after: 'Нужен deterministic order с tie-breaker, например score desc, id desc.' },
      difficulty: { changed: true, before: null, after: 'middle' },
      topics: {
        changed: true,
        before: [],
        after: snapshotTopics(['topic-search', 'topic-sql']),
        added: snapshotTopics(['topic-search', 'topic-sql']),
        removed: [],
      },
    },
  };
}

export async function installUiSnapshotMocking(page, scenario) {
  const actor = resolveActor(scenario);

  await page.addInitScript(
    ({ now, actor: currentActor }) => {
      const fixedNow = new Date(now).valueOf();
      Date.now = () => fixedNow;
      window.localStorage.setItem('nord.dev.actor', currentActor);
      window.localStorage.setItem('nord.access.token', `ui-snapshot-${currentActor}`);

      const OriginalDate = Date;
      class FixedDate extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(now);
            return;
          }

          super(...args);
        }

        static now() {
          return fixedNow;
        }
      }

      window.Date = FixedDate;

      const installStyle = () => {
        const style = document.createElement('style');
        style.innerHTML = `
          *,
          *::before,
          *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            caret-color: transparent !important;
          }

          .v-snackbar {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      };

      if (document.head) {
        installStyle();
      } else {
        document.addEventListener('DOMContentLoaded', installStyle, { once: true });
      }
    },
    { now: NOW_ISO, actor },
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const searchParams = requestUrl.searchParams;
    const currentActor = route.request().headers()['x-dev-actor'] ?? actor;

    if (pathname === '/api/me') {
      await route.fulfill(json(profileByActor(currentActor)));
      return;
    }

    if (pathname === '/api/analytics/growth') {
      await route.fulfill(json(growthAnalytics));
      return;
    }

    if (pathname === '/api/analytics/bank') {
      await route.fulfill(json(bankAnalytics));
      return;
    }

    if (pathname === '/api/topics') {
      const usedOnly = searchParams.get('usedOnly') === 'true';
      const limit = Number(searchParams.get('limit') ?? topicCatalog.length);
      const offset = Number(searchParams.get('offset') ?? 0);
      const items = (usedOnly ? topicCatalog.filter((item) => item.questionsCount > 0) : topicCatalog)
        .slice(offset, offset + limit);

      await route.fulfill(
        json({
          items,
          total: usedOnly ? topicCatalog.filter((item) => item.questionsCount > 0).length : topicCatalog.length,
          meta: {
            tookMs: 11,
            appliedFilters: {
              q: searchParams.get('q'),
              usedOnly,
            },
          },
        }),
      );
      return;
    }

    if (pathname === '/api/training/presets') {
      await route.fulfill(json(trainingPresets));
      return;
    }

    if (pathname === '/api/training/prepare') {
      await route.fulfill(json(preparedTraining));
      return;
    }

    if (pathname === '/api/training/results') {
      await route.fulfill(
        json({
          id: 'snapshot-training-session',
          status: 'COMPLETED',
          resultsCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          finishedAt: NOW_ISO,
        }, 201),
      );
      return;
    }

    if (pathname === '/api/search/questions') {
      await route.fulfill(
        json({
          items: questions,
          total: questions.length,
          meta: {
            tookMs: 14,
            appliedFilters: {
              difficulty: [],
              topicIds: [],
              sort: 'newest',
            },
          },
        }),
      );
      return;
    }

    if (pathname === '/api/questions/question-postgres-indexes') {
      await route.fulfill(json(questions[0]));
      return;
    }

    if (pathname === '/api/question-change-requests/review') {
      await route.fulfill(json(scenario === 'review-empty' ? [] : reviewQueue));
      return;
    }

    if (pathname.startsWith('/api/question-change-requests/')) {
      const id = pathname.split('/').pop();
      await route.fulfill(json(pickReviewDetail(id)));
      return;
    }

    if (pathname === '/api/question-change-requests/my') {
      await route.fulfill(json([]));
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        message: `Unhandled UI snapshot route: ${pathname}`,
      }),
    });
  });
}

export async function prepareSnapshotScenario(page, scenario) {
  if (scenario === 'training-active' || scenario === 'training-exit') {
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Backend Core' }).click();
    await page.getByRole('button', { name: 'Подобрать вопросы' }).click();
    await page.waitForSelector('.training-session-shell');

    if (scenario === 'training-exit') {
      await stabilizeSnapshotViewport(page);
      await page.getByRole('button', { name: 'Выйти' }).click();
      await page.waitForSelector('.training-exit-dialog');
    }
  }
}

export async function stabilizeSnapshotViewport(page) {
  await page.evaluate(() => {
    const candidates = [
      document.scrollingElement,
      document.documentElement,
      document.body,
      ...document.querySelectorAll('*'),
    ];

    for (const node of candidates) {
      if (!(node instanceof HTMLElement) && node !== document.documentElement) {
        continue;
      }

      const element = node;
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(100);
}

export async function prepareSnapshotPage(browser, baseURL, viewportConfig, scenario) {
  const context = await browser.newContext({
    viewport: viewportConfig.viewport,
    userAgent: viewportConfig.userAgent,
    deviceScaleFactor: viewportConfig.deviceScaleFactor,
    isMobile: viewportConfig.isMobile,
    hasTouch: viewportConfig.hasTouch,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await installUiSnapshotMocking(page, scenario);
  return { context, page, url: `${baseURL}` };
}

export async function withSnapshotBrowser(callback) {
  const browser = await chromium.launch();
  try {
    return await callback(browser);
  } finally {
    await browser.close();
  }
}

export async function resetLatestSnapshotsDir(rootDir) {
  const latestDir = path.join(rootDir, 'Docs', 'Snapshots', 'latest');
  await rm(latestDir, { recursive: true, force: true });
  await mkdir(latestDir, { recursive: true });
  return latestDir;
}
