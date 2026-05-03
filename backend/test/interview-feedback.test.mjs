import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildInterviewFeedback } = require('../dist/src/modules/interviews/interview-feedback.js');

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
