import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildGrowthRecommendations,
  buildManagerReport,
  resolveStackLevel,
} = require('../dist/src/modules/analytics/analytics-derived.js');

test('resolveStackLevel maps assessed stack accuracy to named technology level', () => {
  assert.equal(resolveStackLevel({ assessedCount: 0, accuracy: 0 }), 'not_assessed');
  assert.equal(resolveStackLevel({ assessedCount: 2, accuracy: 35 }), 'junior');
  assert.equal(resolveStackLevel({ assessedCount: 3, accuracy: 62 }), 'middle');
  assert.equal(resolveStackLevel({ assessedCount: 5, accuracy: 78 }), 'senior');
  assert.equal(resolveStackLevel({ assessedCount: 8, accuracy: 92 }), 'lead');
});

test('buildGrowthRecommendations returns topic, question and growth-area recommendations', () => {
  const recommendations = buildGrowthRecommendations({
    weakTopics: [
      {
        topicId: 'topic-ts',
        name: 'TypeScript',
        slug: 'typescript',
        correctCount: 2,
        partialCount: 3,
        incorrectCount: 4,
        accuracy: 22,
      },
    ],
    failedQuestions: [
      {
        questionId: 'question-1',
        text: 'Как работает narrowing?',
        textContent: [{ kind: 'text', content: 'Как работает narrowing?' }],
        difficulty: 'middle',
        topics: [{ id: 'topic-ts', name: 'TypeScript', slug: 'typescript' }],
        correctCount: 0,
        partialCount: 1,
        incorrectCount: 2,
        lastResult: 'incorrect',
        lastAnsweredAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ],
    growthAreaProgress: [
      {
        competencyId: 'competency-testing',
        name: 'Testing',
        slug: 'testing',
        latestGrowthArea: 'Добавить практику edge cases.',
        firstSeenAt: '2026-04-01T00:00:00.000Z',
        lastSeenAt: '2026-05-01T00:00:00.000Z',
        totalGrowthPoints: 3,
        resolvedCount: 1,
        currentStatus: 'in_progress',
        accuracy: 40,
        entries: [],
      },
    ],
  });

  assert.equal(recommendations.length, 3);
  assert.deepEqual(
    recommendations.map((item) => item.kind),
    ['topic', 'question', 'growth_area'],
  );
  assert.match(recommendations[0].text, /TypeScript/);
  assert.match(recommendations[1].text, /narrowing/);
  assert.match(recommendations[2].text, /edge cases/);
});

test('buildManagerReport highlights risk employees and team recommendations', () => {
  const report = buildManagerReport({
    generatedAt: new Date('2026-05-03T00:00:00.000Z'),
    summary: {
      employeesCount: 2,
      employeesWithAnswersCount: 2,
      totalAnswers: 20,
      averageAccuracy: 55,
    },
    employees: [
      {
        user: {
          id: 'user-a',
          login: 'anna',
          displayName: 'Anna',
          role: 'USER',
        },
        stacks: [{ id: 'stack-1', name: 'Frontend', slug: 'frontend' }],
        stackLevels: [
          {
            stack: { id: 'stack-1', name: 'Frontend', slug: 'frontend' },
            assessedCount: 5,
            accuracy: 40,
            level: 'junior',
          },
        ],
        summary: {
          totalAnswers: 10,
          correctCount: 4,
          partialCount: 2,
          incorrectCount: 4,
          accuracy: 40,
          trainingSessionsCount: 2,
          completedInterviewsCount: 1,
          feedbackCount: 1,
          lastActivityAt: '2026-05-01T00:00:00.000Z',
        },
        growthTopics: [
          {
            topicId: 'topic-js',
            name: 'JavaScript',
            slug: 'javascript',
            correctCount: 1,
            partialCount: 1,
            incorrectCount: 3,
            accuracy: 20,
          },
        ],
      },
      {
        user: {
          id: 'user-b',
          login: 'boris',
          displayName: 'Boris',
          role: 'USER',
        },
        stacks: [],
        stackLevels: [],
        summary: {
          totalAnswers: 10,
          correctCount: 7,
          partialCount: 2,
          incorrectCount: 1,
          accuracy: 70,
          trainingSessionsCount: 1,
          completedInterviewsCount: 2,
          feedbackCount: 2,
          lastActivityAt: '2026-05-02T00:00:00.000Z',
        },
        growthTopics: [],
      },
    ],
  });

  assert.equal(report.generatedAt, '2026-05-03T00:00:00.000Z');
  assert.match(report.summaryText, /2 сотрудников/);
  assert.equal(report.riskEmployees[0].user.id, 'user-a');
  assert.match(report.recommendations[0], /Anna/);
});
