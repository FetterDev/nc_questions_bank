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

const companyCatalog = [
  { id: 'company-google', name: 'Google', questionsCount: 4 },
  { id: 'company-yandex', name: 'Yandex', questionsCount: 2 },
];

const competencyStack = { id: 'stack-backend', name: 'Backend', slug: 'backend', competenciesCount: 2 };
const frontendStack = { id: 'stack-frontend', name: 'Frontend', slug: 'frontend', competenciesCount: 1 };

const competencyCatalog = [
  {
    id: 'competency-sql-query-design',
    stackId: competencyStack.id,
    stack: competencyStack,
    name: 'SQL query design',
    slug: 'sql-query-design',
    description: 'Проектирование запросов, индексов и устойчивой пагинации.',
    position: 1,
  },
  {
    id: 'competency-service-boundaries',
    stackId: competencyStack.id,
    stack: competencyStack,
    name: 'Service boundaries',
    slug: 'service-boundaries',
    description: 'Границы бизнес-логики, транзакций и внешних вызовов.',
    position: 2,
  },
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

const questionCompetencies = (ids) =>
  ids.map((id) => {
    const competency = competencyCatalog.find((item) => item.id === id);
    return {
      id: competency.id,
      name: competency.name,
      slug: competency.slug,
      stack: competency.stack,
    };
  });

const evaluationCriteria = (ids) =>
  questionCompetencies(ids).map((competency, index) => ({
    id: `criterion-${competency.slug}`,
    title: index === 0 ? 'Обоснование решения' : 'Границы применения',
    description: index === 0
      ? 'Объясняет выбранный подход и его tradeoff.'
      : 'Отделяет допустимый сценарий от рискованного.',
    weight: index + 1,
    position: index + 1,
    competency,
  }));

const content = (text, code, codeLanguage) => [
  { kind: 'text', content: text },
  ...(code
    ? [
        {
          kind: 'code',
          content: code,
          ...(codeLanguage ? { language: codeLanguage } : {}),
        },
      ]
    : []),
];

const adminProfile = {
  id: 'user-admin',
  login: 'nord.admin',
  email: 'nord.admin@nord.local',
  displayName: 'Nord Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const managerProfile = {
  id: 'user-manager',
  login: 'nord.manager',
  email: 'nord.manager@nord.local',
  displayName: 'Nord Manager',
  role: 'MANAGER',
  status: 'ACTIVE',
};

const userProfile = {
  id: 'user-growth',
  login: 'nord.user',
  email: 'nord.user@nord.local',
  displayName: 'Nord User',
  role: 'USER',
  status: 'ACTIVE',
};

const reviewAuthor = {
  id: 'user-editor',
  login: 'editor',
  email: 'editor@nord.local',
  displayName: 'Nord Editor',
  role: 'USER',
  status: 'ACTIVE',
};

const peerProfile = {
  id: 'user-peer',
  login: 'peer.user',
  email: 'peer@nord.local',
  displayName: 'Peer User',
  role: 'USER',
  status: 'ACTIVE',
};

const userRecords = [
  {
    ...adminProfile,
    stacks: [],
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-07T08:00:00.000Z',
  },
  {
    ...managerProfile,
    stacks: [competencyStack],
    createdAt: '2026-03-01T08:10:00.000Z',
    updatedAt: '2026-03-07T08:10:00.000Z',
  },
  {
    ...userProfile,
    stacks: [competencyStack],
    createdAt: '2026-03-01T08:20:00.000Z',
    updatedAt: '2026-03-07T08:20:00.000Z',
  },
  {
    ...peerProfile,
    stacks: [competencyStack, frontendStack],
    createdAt: '2026-03-01T08:30:00.000Z',
    updatedAt: '2026-03-07T08:30:00.000Z',
  },
];

const questions = [
  {
    id: 'question-postgres-indexes',
    text: 'Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?',
    textContent: content('Когда в PostgreSQL для фильтрации и сортировки нужен составной индекс?'),
    answer: 'Когда запрос стабильно использует один и тот же префикс where/order by и без него план уходит в seq scan или filesort.',
    answerContent: content('Когда запрос стабильно использует один и тот же префикс where/order by и без него план уходит в seq scan или filesort.'),
    difficulty: 'middle',
    company: companyCatalog[0],
    topics: questionTopics(['topic-postgres', 'topic-perf', 'topic-sql']),
    competencies: questionCompetencies(['competency-sql-query-design']),
    evaluationCriteria: evaluationCriteria(['competency-sql-query-design']),
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
    company: null,
    topics: questionTopics(['topic-prisma', 'topic-search', 'topic-nest']),
    competencies: questionCompetencies(['competency-sql-query-design']),
    evaluationCriteria: evaluationCriteria(['competency-sql-query-design']),
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
    company: companyCatalog[1],
    topics: questionTopics(['topic-nest', 'topic-prisma']),
    competencies: questionCompetencies(['competency-service-boundaries']),
    evaluationCriteria: evaluationCriteria(['competency-service-boundaries']),
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

const trainingParticipants = {
  items: [
    {
      id: peerProfile.id,
      login: peerProfile.login,
      displayName: peerProfile.displayName,
    },
  ],
};

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
    partialCount: 3,
    incorrectCount: 6,
    accuracy: 50,
  },
  weakTopics: [
    {
      topicId: 'topic-search',
      name: 'Search',
      slug: 'search',
      correctCount: 1,
      partialCount: 1,
      incorrectCount: 5,
      accuracy: 17,
    },
    {
      topicId: 'topic-prisma',
      name: 'Prisma',
      slug: 'prisma',
      correctCount: 3,
      partialCount: 2,
      incorrectCount: 4,
      accuracy: 43,
    },
    {
      topicId: 'topic-postgres',
      name: 'PostgreSQL',
      slug: 'postgresql',
      correctCount: 5,
      partialCount: 1,
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
      partialCount: 1,
      incorrectCount: 4,
      lastResult: 'incorrect',
      lastAnsweredAt: '2026-03-07T11:54:00.000Z',
    },
    {
      questionId: 'growth-failed-prisma',
      text: 'Почему similarity-фильтры не должны жить в controller?',
      textContent: content('Почему similarity-фильтры не должны жить в controller?'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-prisma', 'topic-search']),
      correctCount: 1,
      partialCount: 2,
      incorrectCount: 3,
      lastResult: 'partial',
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
      partialCount: 1,
      incorrectCount: 1,
      lastResult: 'correct',
      lastAnsweredAt: '2026-03-07T10:52:00.000Z',
    },
    {
      questionId: 'growth-answered-index',
      text: 'Когда нужен составной индекс под where + order by?',
      textContent: content('Когда нужен составной индекс под where + order by?'),
      difficulty: 'middle',
      topics: snapshotTopics(['topic-postgres', 'topic-sql']),
      correctCount: 3,
      partialCount: 1,
      incorrectCount: 2,
      lastResult: 'correct',
      lastAnsweredAt: '2026-03-07T10:11:00.000Z',
    },
  ],
  feedbackEntries: [
    {
      sessionId: 'training-session-feedback',
      trainer: {
        id: managerProfile.id,
        displayName: managerProfile.displayName,
        login: managerProfile.login,
      },
      feedback: 'Усилить объяснение tradeoff и проговаривать ограничения выбранного решения.',
      finishedAt: '2026-03-07T10:20:00.000Z',
    },
  ],
  growthAreaProgress: [
    {
      competencyId: 'competency-sql-query-design',
      name: 'SQL query design',
      slug: 'sql-query-design',
      latestGrowthArea: 'Стабилизировать объяснение индексов и pagination tie-breaker.',
      firstSeenAt: '2026-03-01T10:00:00.000Z',
      lastSeenAt: '2026-03-07T10:00:00.000Z',
      totalGrowthPoints: 3,
      resolvedCount: 1,
      currentStatus: 'in_progress',
      accuracy: 44,
      entries: [],
    },
  ],
  recommendations: [
    {
      kind: 'topic',
      text: 'Повторить Search и Prisma на вопросах с raw SQL и ранжированием.',
      priority: 1,
    },
    {
      kind: 'growth_area',
      text: 'На каждом ответе фиксировать tradeoff и ограничение применения.',
      priority: 2,
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

const teamAnalytics = {
  summary: {
    employeesCount: 2,
    employeesWithAnswersCount: 2,
    totalAnswers: 54,
    averageAccuracy: 57,
  },
  items: [
    {
      user: {
        id: userProfile.id,
        login: userProfile.login,
        displayName: userProfile.displayName,
        role: userProfile.role,
      },
      stacks: [competencyStack],
      stackLevels: [
        {
          stack: competencyStack,
          assessedCount: 14,
          accuracy: 58,
          level: 'middle',
        },
      ],
      summary: {
        totalAnswers: 24,
        correctCount: 12,
        partialCount: 5,
        incorrectCount: 7,
        accuracy: 50,
        trainingSessionsCount: 4,
        completedInterviewsCount: 2,
        feedbackCount: 2,
        lastActivityAt: '2026-03-07T10:20:00.000Z',
      },
      growthTopics: [
        {
          topicId: 'topic-search',
          name: 'Search',
          slug: 'search',
          correctCount: 1,
          partialCount: 2,
          incorrectCount: 5,
          accuracy: 27,
        },
      ],
    },
    {
      user: {
        id: peerProfile.id,
        login: peerProfile.login,
        displayName: peerProfile.displayName,
        role: peerProfile.role,
      },
      stacks: [competencyStack, frontendStack],
      stackLevels: [
        {
          stack: competencyStack,
          assessedCount: 16,
          accuracy: 72,
          level: 'senior',
        },
      ],
      summary: {
        totalAnswers: 30,
        correctCount: 19,
        partialCount: 4,
        incorrectCount: 7,
        accuracy: 63,
        trainingSessionsCount: 3,
        completedInterviewsCount: 3,
        feedbackCount: 1,
        lastActivityAt: '2026-03-06T16:30:00.000Z',
      },
      growthTopics: [
        {
          topicId: 'topic-prisma',
          name: 'Prisma',
          slug: 'prisma',
          correctCount: 4,
          partialCount: 1,
          incorrectCount: 3,
          accuracy: 56,
        },
      ],
    },
  ],
  managerReport: {
    generatedAt: NOW_ISO,
    summaryText: '2 сотрудника, оба с данными, средняя успешность 57%.',
    riskEmployees: [
      {
        user: {
          id: userProfile.id,
          login: userProfile.login,
          displayName: userProfile.displayName,
          role: userProfile.role,
        },
        accuracy: 50,
        totalAnswers: 24,
        growthTopics: [
          {
            topicId: 'topic-search',
            name: 'Search',
            slug: 'search',
            correctCount: 1,
            partialCount: 2,
            incorrectCount: 5,
            accuracy: 27,
          },
        ],
        stackLevels: [
          {
            stack: competencyStack,
            assessedCount: 14,
            accuracy: 58,
            level: 'middle',
          },
        ],
      },
    ],
    recommendations: [
      'Назначить тренировку по Search и SQL pagination.',
      'Проверить объяснение tradeoff на следующем интервью.',
    ],
  },
};

const trainingHistorySessions = [
  {
    id: 'training-history-1',
    status: 'COMPLETED',
    resultsCount: 3,
    correctCount: 1,
    partialCount: 1,
    incorrectCount: 1,
    feedback: 'Хорошая структура, но не хватает явного tie-breaker в объяснении.',
    trainer: {
      id: managerProfile.id,
      login: managerProfile.login,
      displayName: managerProfile.displayName,
    },
    finishedAt: '2026-03-07T10:20:00.000Z',
  },
  {
    id: 'training-history-2',
    status: 'ABANDONED_SAVED',
    resultsCount: 2,
    correctCount: 1,
    partialCount: 0,
    incorrectCount: 1,
    feedback: null,
    trainer: null,
    finishedAt: '2026-03-06T13:40:00.000Z',
  },
];

const trainingHistoryDetail = {
  ...trainingHistorySessions[0],
  results: [
    {
      questionId: 'training-card-1',
      text: preparedTraining.items[0].text,
      textContent: preparedTraining.items[0].textContent,
      difficulty: preparedTraining.items[0].difficulty,
      result: 'correct',
      position: 0,
      topics: preparedTraining.items[0].topics,
    },
    {
      questionId: 'training-card-2',
      text: preparedTraining.items[1].text,
      textContent: preparedTraining.items[1].textContent,
      difficulty: preparedTraining.items[1].difficulty,
      result: 'partial',
      position: 1,
      topics: preparedTraining.items[1].topics,
    },
    {
      questionId: 'training-card-3',
      text: preparedTraining.items[2].text,
      textContent: preparedTraining.items[2].textContent,
      difficulty: preparedTraining.items[2].difficulty,
      result: 'incorrect',
      position: 2,
      topics: preparedTraining.items[2].topics,
    },
  ],
};

const monthDays = Array.from({ length: 31 }, (_, index) => ({
  date: `2026-03-${String(index + 1).padStart(2, '0')}`,
}));

const interviewPreset = {
  id: trainingPresets[0].id,
  name: trainingPresets[0].name,
};

const interviewUsers = {
  interviewer: {
    id: userProfile.id,
    login: userProfile.login,
    displayName: userProfile.displayName,
  },
  interviewee: {
    id: peerProfile.id,
    login: peerProfile.login,
    displayName: peerProfile.displayName,
  },
};

const interviewItems = [
  {
    id: 'interview-draft-1',
    status: 'DRAFT',
    plannedDate: null,
    preset: null,
    interviewer: interviewUsers.interviewer,
    interviewee: interviewUsers.interviewee,
    completedAt: null,
    resultsCount: 0,
    correctCount: 0,
    partialCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'interview-scheduled-1',
    status: 'SCHEDULED',
    plannedDate: '2026-03-11',
    preset: interviewPreset,
    interviewer: interviewUsers.interviewer,
    interviewee: interviewUsers.interviewee,
    completedAt: null,
    resultsCount: 0,
    correctCount: 0,
    partialCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'interview-completed-1',
    status: 'COMPLETED',
    plannedDate: '2026-03-06',
    preset: interviewPreset,
    interviewer: interviewUsers.interviewer,
    interviewee: interviewUsers.interviewee,
    completedAt: '2026-03-06T15:00:00.000Z',
    resultsCount: 3,
    correctCount: 1,
    partialCount: 1,
    incorrectCount: 1,
  },
];

const adminInterviewCalendar = {
  month: '2026-03',
  days: monthDays,
  items: interviewItems.slice(1),
  activeCycle: {
    id: 'cycle-march-week',
    mode: 'AUTO',
    periodStart: '2026-03-09',
    periodEnd: '2026-03-15',
    createdByAdmin: {
      id: managerProfile.id,
      login: managerProfile.login,
      displayName: managerProfile.displayName,
    },
    interviews: interviewItems,
  },
};

const myInterviewCalendar = {
  month: '2026-03',
  days: monthDays,
  items: interviewItems.slice(1).map((item) => ({
    ...item,
    myRole: item.id === 'interview-scheduled-1' ? 'interviewer' : 'interviewee',
  })),
};

const runtimeCriteria = evaluationCriteria(['competency-sql-query-design']).map((criterion, index) => ({
  id: `runtime-${criterion.id}`,
  sourceCriterionId: criterion.id,
  competency: {
    id: criterion.competency.id,
    name: criterion.competency.name,
    slug: criterion.competency.slug,
  },
  title: criterion.title,
  description: criterion.description,
  weight: criterion.weight,
  position: index,
}));

const interviewRuntime = {
  interview: interviewItems[1],
  counterpart: interviewUsers.interviewee,
  items: [
    {
      id: 'runtime-question-1',
      questionId: questions[0].id,
      questionText: questions[0].text,
      questionTextContent: questions[0].textContent,
      answer: questions[0].answer,
      answerContent: questions[0].answerContent,
      difficulty: questions[0].difficulty,
      position: 0,
      topics: questions[0].topics,
      criteria: runtimeCriteria,
    },
  ],
};

const interviewDashboard = {
  summary: {
    totalInterviews: 8,
    draftCount: 1,
    plannedCount: 2,
    scheduledCount: 3,
    completedCount: 2,
    resultsCount: 12,
    correctCount: 5,
    partialCount: 4,
    incorrectCount: 3,
  },
  scheduleSeries: [
    {
      bucketStart: '2026-03-02',
      draftCount: 1,
      plannedCount: 1,
      scheduledCount: 1,
      completedCount: 1,
      overdueCount: 0,
    },
    {
      bucketStart: '2026-03-09',
      draftCount: 0,
      plannedCount: 1,
      scheduledCount: 2,
      completedCount: 1,
      overdueCount: 0,
    },
  ],
  outcomeMix: {
    correctCount: 5,
    partialCount: 4,
    incorrectCount: 3,
  },
  interviewerLoad: [
    {
      interviewer: interviewUsers.interviewer,
      assignedCount: 4,
      completedCount: 2,
    },
  ],
  weakTopics: [
    {
      topicId: 'topic-search',
      name: 'Search',
      correctCount: 1,
      partialCount: 2,
      incorrectCount: 3,
      accuracy: 33,
    },
  ],
  upcoming: [interviewItems[1]],
  recentCompleted: [interviewItems[2]],
};

const myInterviewDashboard = {
  summary: interviewDashboard.summary,
  outcomeSeries: [
    {
      bucketStart: '2026-03-02',
      correctCount: 2,
      partialCount: 1,
      incorrectCount: 1,
    },
    {
      bucketStart: '2026-03-09',
      correctCount: 3,
      partialCount: 3,
      incorrectCount: 2,
    },
  ],
  weakTopics: interviewDashboard.weakTopics,
  feedbackEntries: [
    {
      interviewId: 'interview-completed-1',
      interviewer: interviewUsers.interviewer,
      feedback: 'Ответы структурные, но нужно сильнее фиксировать ограничения решения.',
      growthAreas: 'Tradeoff, edge cases, индексы',
      completedAt: '2026-03-06T15:00:00.000Z',
    },
  ],
  recentInterviews: [interviewItems[2]],
};

const interviewDetail = {
  interview: interviewItems[2],
  interviewer: interviewUsers.interviewer,
  interviewee: interviewUsers.interviewee,
  feedback: 'Ответы структурные, но нужно сильнее фиксировать ограничения решения.',
  growthAreas: 'Tradeoff, edge cases, индексы',
  questions: [
    {
      id: 'history-question-1',
      questionId: questions[0].id,
      questionText: questions[0].text,
      questionTextContent: questions[0].textContent,
      answer: questions[0].answer,
      answerContent: questions[0].answerContent,
      difficulty: questions[0].difficulty,
      result: 'partial',
      position: 0,
      topics: questions[0].topics,
      criteria: runtimeCriteria.map((criterion) => ({
        ...criterion,
        id: `history-${criterion.id}`,
        result: 'partial',
        comment: 'Компромисс назван, но без привязки к ограничениям.',
        isGrowthPoint: true,
        growthArea: 'Привязывать tradeoff к ограничению задачи.',
      })),
    },
  ],
  competencySummary: [
    {
      competencyId: 'competency-sql-query-design',
      name: 'SQL query design',
      slug: 'sql-query-design',
      correctCount: 1,
      partialCount: 1,
      incorrectCount: 1,
      accuracy: 50,
    },
  ],
};

const matrixCompetencies = competencyCatalog.map((competency, index) => ({
  id: competency.id,
  stack: competency.stack,
  name: competency.name,
  slug: competency.slug,
  description: competency.description,
  position: competency.position,
  totalCount: index === 0 ? 9 : 5,
  correctCount: index === 0 ? 4 : 2,
  partialCount: index === 0 ? 2 : 1,
  incorrectCount: index === 0 ? 3 : 2,
  accuracy: index === 0 ? 56 : 50,
  lastResult: index === 0 ? 'partial' : 'incorrect',
  lastAssessedAt: '2026-03-06T15:00:00.000Z',
}));

const competencyMatrixUser = {
  user: {
    id: userProfile.id,
    login: userProfile.login,
    displayName: userProfile.displayName,
  },
  stacks: [competencyStack],
  competencies: matrixCompetencies,
  stackLevels: [
    {
      stack: competencyStack,
      assessedCount: 14,
      accuracy: 54,
      level: 'middle',
    },
  ],
};

const competencyMatrixPeer = {
  ...competencyMatrixUser,
  user: {
    id: peerProfile.id,
    login: peerProfile.login,
    displayName: peerProfile.displayName,
  },
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
    company: null,
    topics: snapshotTopics(['topic-postgres', 'topic-sql']),
    competencies: questionCompetencies(['competency-sql-query-design']),
    evaluationCriteria: evaluationCriteria(['competency-sql-query-design']),
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
    company: companyCatalog[0],
    topics: snapshotTopics(['topic-postgres', 'topic-sql', 'topic-perf']),
    competencies: questionCompetencies(['competency-sql-query-design']),
    evaluationCriteria: evaluationCriteria(['competency-sql-query-design']),
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
    company: {
      changed: true,
      before: null,
      after: companyCatalog[0],
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
  if (scenario === 'login') {
    return null;
  }

  if (
    scenario === 'growth-user' ||
    scenario === 'training-setup' ||
    scenario === 'training-active' ||
    scenario === 'training-exit' ||
    scenario === 'training-history' ||
    scenario === 'question-details-user' ||
    scenario === 'my-requests' ||
    scenario === 'my-interviews' ||
    scenario === 'my-interviews-dashboard' ||
    scenario === 'interview-history' ||
    scenario === 'interview-runtime' ||
    scenario === 'competency-matrix-user'
  ) {
    return 'user';
  }

  if (
    scenario === 'editor-create' ||
    scenario === 'editor-edit' ||
    scenario === 'review-filled' ||
    scenario === 'review-empty' ||
    scenario === 'bank-analysis' ||
    scenario === 'topics-admin' ||
    scenario === 'companies-admin' ||
    scenario === 'training-presets' ||
    scenario === 'team-dashboard' ||
    scenario === 'employee-interview-history' ||
    scenario === 'interviews-admin' ||
    scenario === 'interviews-dashboard' ||
    scenario === 'competency-matrix-manager'
  ) {
    return 'manager';
  }

  return 'admin';
}

function profileByActor(actor) {
  if (actor === 'user') {
    return userProfile;
  }

  if (actor === 'manager') {
    return managerProfile;
  }

  return adminProfile;
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
    name: 'login',
    path: '/login',
    scenario: 'login',
  },
  {
    name: 'bank',
    path: '/bank',
    scenario: 'bank',
  },
  {
    name: 'question-details-user',
    path: '/question/question-postgres-indexes',
    scenario: 'question-details-user',
  },
  {
    name: 'editor-create',
    path: '/editor',
    scenario: 'editor-create',
  },
  {
    name: 'editor-edit',
    path: '/editor/question-postgres-indexes',
    scenario: 'editor-edit',
  },
  {
    name: 'my-requests',
    path: '/requests?selected=request-update-postgres',
    scenario: 'my-requests',
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
    name: 'topics-admin',
    path: '/topics',
    scenario: 'topics-admin',
  },
  {
    name: 'companies-admin',
    path: '/companies',
    scenario: 'companies-admin',
  },
  {
    name: 'users-admin',
    path: '/users',
    scenario: 'users-admin',
  },
  {
    name: 'training-setup',
    path: '/training',
    scenario: 'training-setup',
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
    name: 'training-history',
    path: '/training-history/training-history-1',
    scenario: 'training-history',
  },
  {
    name: 'training-presets',
    path: '/training-presets',
    scenario: 'training-presets',
  },
  {
    name: 'bank-analysis',
    path: '/bank-analysis',
    scenario: 'bank-analysis',
  },
  {
    name: 'team-dashboard',
    path: '/team',
    scenario: 'team-dashboard',
  },
  {
    name: 'employee-interview-history',
    path: '/team/user-growth/interview-history/interview-completed-1',
    scenario: 'employee-interview-history',
  },
  {
    name: 'interviews-admin',
    path: '/interviews',
    scenario: 'interviews-admin',
  },
  {
    name: 'interviews-dashboard',
    path: '/interviews-dashboard',
    scenario: 'interviews-dashboard',
  },
  {
    name: 'my-interviews',
    path: '/my-interviews',
    scenario: 'my-interviews',
  },
  {
    name: 'my-interviews-dashboard',
    path: '/my-interviews-dashboard',
    scenario: 'my-interviews-dashboard',
  },
  {
    name: 'interview-history',
    path: '/interview-history/interview-completed-1',
    scenario: 'interview-history',
  },
  {
    name: 'interview-runtime',
    path: '/interviews/interview-scheduled-1/run',
    scenario: 'interview-runtime',
  },
  {
    name: 'competency-matrix-user',
    path: '/competency-matrix',
    scenario: 'competency-matrix-user',
  },
  {
    name: 'competency-matrix-manager',
    path: '/competency-matrix',
    scenario: 'competency-matrix-manager',
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
      company: null,
      topics: snapshotTopics(['topic-search', 'topic-sql']),
      competencies: questionCompetencies(['competency-sql-query-design']),
      evaluationCriteria: evaluationCriteria(['competency-sql-query-design']),
    },
    fieldDiffs: {
      text: { changed: true, before: null, after: 'Как стабилизировать пагинацию в search endpoint?' },
      answer: { changed: true, before: null, after: 'Нужен deterministic order с tie-breaker, например score desc, id desc.' },
      difficulty: { changed: true, before: null, after: 'middle' },
      company: {
        changed: false,
        before: null,
        after: null,
      },
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

      if (currentActor) {
        window.localStorage.setItem('nord.dev.actor', currentActor);
        window.localStorage.setItem('nord.access.token', `ui-snapshot-${currentActor}`);
      } else {
        window.localStorage.removeItem('nord.dev.actor');
        window.localStorage.removeItem('nord.access.token');
      }

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

    if (pathname === '/api/analytics/team') {
      await route.fulfill(json(teamAnalytics));
      return;
    }

    if (pathname === '/api/users') {
      const role = searchParams.get('role');
      const status = searchParams.get('status');
      const q = (searchParams.get('q') ?? '').toLocaleLowerCase('ru-RU');
      const limit = Number(searchParams.get('limit') ?? userRecords.length);
      const offset = Number(searchParams.get('offset') ?? 0);
      const filtered = userRecords.filter((item) => {
        const matchesRole = !role || item.role === role;
        const matchesStatus = !status || item.status === status;
        const matchesSearch =
          !q ||
          `${item.login} ${item.displayName} ${item.email ?? ''}`
            .toLocaleLowerCase('ru-RU')
            .includes(q);

        return matchesRole && matchesStatus && matchesSearch;
      });

      await route.fulfill(
        json({
          items: filtered.slice(offset, offset + limit),
          total: filtered.length,
          meta: {
            tookMs: 7,
            appliedFilters: {
              q: searchParams.get('q'),
              role,
              status,
            },
          },
        }),
      );
      return;
    }

    if (pathname === '/api/stacks') {
      await route.fulfill(
        json({
          items: [competencyStack, frontendStack],
          total: 2,
          meta: {
            tookMs: 6,
            appliedFilters: {
              q: searchParams.get('q'),
            },
          },
        }),
      );
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

    if (pathname === '/api/companies') {
      await route.fulfill(
        json({
          items: companyCatalog,
          total: companyCatalog.length,
          meta: {
            tookMs: 8,
            appliedFilters: {
              q: searchParams.get('q'),
            },
          },
        }),
      );
      return;
    }

    if (pathname === '/api/competencies') {
      await route.fulfill(
        json({
          items: competencyCatalog,
          total: competencyCatalog.length,
          meta: {
            tookMs: 9,
            appliedFilters: {
              q: searchParams.get('q'),
              stackId: searchParams.get('stackId'),
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

    if (pathname === '/api/training/history') {
      await route.fulfill(
        json({
          items: trainingHistorySessions,
        }),
      );
      return;
    }

    if (pathname.startsWith('/api/training/history/')) {
      await route.fulfill(json(trainingHistoryDetail));
      return;
    }

    if (pathname === '/api/training/participants') {
      await route.fulfill(json(trainingParticipants));
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

    if (pathname === '/api/question-change-requests/my') {
      await route.fulfill(json(scenario === 'my-requests' ? reviewQueue : []));
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

    if (pathname === '/api/interviews/admin-calendar') {
      await route.fulfill(json(adminInterviewCalendar));
      return;
    }

    if (pathname === '/api/interviews/my-calendar') {
      await route.fulfill(json(myInterviewCalendar));
      return;
    }

    if (pathname === '/api/interviews/admin-dashboard') {
      await route.fulfill(json(interviewDashboard));
      return;
    }

    if (pathname === '/api/interviews/my-dashboard') {
      await route.fulfill(json(myInterviewDashboard));
      return;
    }

    if (pathname === '/api/interviews/my-history') {
      await route.fulfill(
        json({
          items: [interviewItems[2]],
        }),
      );
      return;
    }

    if (pathname.startsWith('/api/interviews/users/') && pathname.endsWith('/history')) {
      await route.fulfill(
        json({
          items: [interviewItems[2]],
        }),
      );
      return;
    }

    if (pathname.startsWith('/api/interviews/') && pathname.endsWith('/runtime')) {
      await route.fulfill(json(interviewRuntime));
      return;
    }

    if (pathname.startsWith('/api/interviews/') && pathname.endsWith('/detail')) {
      await route.fulfill(json(interviewDetail));
      return;
    }

    if (pathname === '/api/competency-matrix/me') {
      await route.fulfill(json(competencyMatrixUser));
      return;
    }

    if (pathname === '/api/competency-matrix') {
      await route.fulfill(
        json({
          items: [competencyMatrixUser, competencyMatrixPeer],
        }),
      );
      return;
    }

    if (pathname.startsWith('/api/competency-matrix/users/')) {
      await route.fulfill(json(competencyMatrixUser));
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
