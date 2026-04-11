import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { questionBank } = require('../scripts/question-bank.data.js');
const { topics } = require('../scripts/topics.data.js');

const difficultyLevels = [1, 2, 3];

test('question bank references only catalog topics and has non-empty content', () => {
  const topicSet = new Set(topics);
  const fingerprints = new Set();

  for (const item of questionBank) {
    assert.equal(typeof item.text, 'string');
    assert.equal(typeof item.answer, 'string');
    assert.ok(item.text.trim().length > 0, 'question text must be non-empty');
    assert.ok(item.answer.trim().length > 0, 'question answer must be non-empty');
    assert.ok(difficultyLevels.includes(item.difficulty), 'difficulty must be 1, 2 or 3');
    assert.ok(Array.isArray(item.topics) && item.topics.length > 0, 'topics must be non-empty');

    for (const topic of item.topics) {
      assert.ok(topicSet.has(topic), `unknown topic "${topic}"`);
    }

    const fingerprint = `${item.text.trim()}|${item.topics.join('|')}`;
    assert.ok(!fingerprints.has(fingerprint), `duplicate question fingerprint "${fingerprint}"`);
    fingerprints.add(fingerprint);
  }
});

test('question bank covers every topic on junior, middle and senior levels', () => {
  const coverage = new Map(
    topics.map((topic) => [
      topic,
      {
        total: 0,
        levels: new Set(),
      },
    ]),
  );

  for (const item of questionBank) {
    for (const topic of item.topics) {
      const topicCoverage = coverage.get(topic);
      topicCoverage.total += 1;
      topicCoverage.levels.add(item.difficulty);
    }
  }

  for (const [topic, topicCoverage] of coverage.entries()) {
    assert.ok(topicCoverage.total > 0, `topic "${topic}" has no questions`);

    for (const level of difficultyLevels) {
      assert.ok(
        topicCoverage.levels.has(level),
        `topic "${topic}" has no questions for difficulty ${level}`,
      );
    }
  }
});
