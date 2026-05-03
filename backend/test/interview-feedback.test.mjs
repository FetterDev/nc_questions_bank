import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildInterviewFeedback } = require('../dist/src/modules/interviews/interview-feedback.js');
const {
  buildInterviewGrowthAreas,
  buildCriterionGrowthArea,
} = require('../dist/src/modules/interviews/interview-growth-areas.js');

test('buildInterviewFeedback forms final feedback from criterion results and comments', () => {
  const feedback = buildInterviewFeedback({
    resultsCount: 3,
    correctCount: 1,
    partialCount: 1,
    incorrectCount: 1,
    criteria: [
      {
        title: 'Называет компромиссы решения',
        competencyName: 'Архитектура',
        result: 'partial',
        comment: 'Компромиссы названы без связи с ограничениями.',
      },
      {
        title: 'Держит performance budget',
        competencyName: 'Frontend',
        result: 'incorrect',
        comment: '',
      },
      {
        title: 'Структурирует ответ',
        competencyName: 'Коммуникация',
        result: 'correct',
        comment: 'Ответ был последовательным.',
      },
    ],
  });

  assert.match(feedback, /Итог: 1 correct, 1 partial, 1 incorrect из 3/);
  assert.match(feedback, /Сильные зоны: Структурирует ответ \(Коммуникация\)/);
  assert.match(
    feedback,
    /Зоны роста: Называет компромиссы решения \(Архитектура\) - partial; Держит performance budget \(Frontend\) - incorrect/,
  );
  assert.match(
    feedback,
    /Комментарии: Называет компромиссы решения: Компромиссы названы без связи с ограничениями.; Структурирует ответ: Ответ был последовательным./,
  );
});

test('buildInterviewFeedback still forms a compact summary without criteria', () => {
  const feedback = buildInterviewFeedback({
    resultsCount: 2,
    correctCount: 2,
    partialCount: 0,
    incorrectCount: 0,
    criteria: [],
  });

  assert.equal(feedback, 'Итог: 2 correct, 0 partial, 0 incorrect из 2. Все вопросы закрыты без явных зон роста.');
});

test('buildCriterionGrowthArea preserves manual growth point text', () => {
  const growthArea = buildCriterionGrowthArea({
    title: 'Проектирует индексы под фильтр',
    competencyName: 'PostgreSQL',
    result: 'correct',
    comment: 'Ответ полный, но нужна практика на compound indexes.',
    isGrowthPoint: true,
    growthArea: 'Больше практики на составных индексах.',
  });

  assert.equal(growthArea, 'Больше практики на составных индексах.');
});

test('buildCriterionGrowthArea auto-forms text for non-correct criteria', () => {
  const growthArea = buildCriterionGrowthArea({
    title: 'Объясняет tradeoff кеширования',
    competencyName: 'Architecture',
    result: 'partial',
    comment: 'Не связал решение с TTL и invalidation.',
  });

  assert.equal(
    growthArea,
    'Объясняет tradeoff кеширования (Architecture) - partial. Не связал решение с TTL и invalidation.',
  );
});

test('buildInterviewGrowthAreas combines explicit and auto growth areas', () => {
  const growthAreas = buildInterviewGrowthAreas({
    manualGrowthAreas: '',
    criteria: [
      {
        title: 'Декомпозирует задачу',
        competencyName: 'System Design',
        result: 'correct',
        comment: '',
      },
      {
        title: 'Проверяет edge cases',
        competencyName: 'Testing',
        result: 'incorrect',
        comment: 'Не назвал пустой список и null input.',
      },
      {
        title: 'Сравнивает варианты',
        competencyName: 'Architecture',
        result: 'correct',
        comment: '',
        isGrowthPoint: true,
        growthArea: 'Закрепить сравнение вариантов через constraints.',
      },
    ],
  });

  assert.match(growthAreas, /Проверяет edge cases \(Testing\) - incorrect/);
  assert.match(growthAreas, /Закрепить сравнение вариантов через constraints\./);
});
