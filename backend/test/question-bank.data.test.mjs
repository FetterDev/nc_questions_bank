import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { questionBank } = require('../scripts/question-bank.data.js');
const { topics } = require('../scripts/topics.data.js');
const { competencyStacks } = require('../scripts/competency-stacks.data.js');

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

test('seed competency stacks are backed by existing question topics', () => {
  const topicSet = new Set(topics);
  const topicQuestionCount = new Map(topics.map((topic) => [topic, 0]));
  const stackNames = competencyStacks.map((stack) => stack.name);

  for (const item of questionBank) {
    for (const topic of item.topics) {
      topicQuestionCount.set(topic, (topicQuestionCount.get(topic) ?? 0) + 1);
    }
  }

  assert.deepEqual(stackNames, ['React', 'Angular', 'Vue']);

  for (const stack of competencyStacks) {
    assert.ok(stack.competencies.length >= 5, `stack "${stack.name}" must be detailed`);

    stack.competencies.forEach((competency, index) => {
      assert.equal(competency.position, index + 1);
      assert.ok(competency.name.trim(), 'competency name must be non-empty');
      assert.ok(competency.description.trim(), 'competency description must be non-empty');
      assert.ok(
        Array.isArray(competency.sourceTopics) && competency.sourceTopics.length > 0,
        `competency "${competency.name}" must reference source topics`,
      );

      for (const topic of competency.sourceTopics) {
        assert.ok(topicSet.has(topic), `unknown competency source topic "${topic}"`);
        assert.ok(
          (topicQuestionCount.get(topic) ?? 0) > 0,
          `source topic "${topic}" has no existing questions`,
        );
      }
    });
  }
});
