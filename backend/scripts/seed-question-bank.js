const { createHash } = require('node:crypto');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { questionBank } = require('./question-bank.data');
const { topics: topicsCatalog } = require('./topics.data');

const SEED_ID_PREFIX = 'seed-question-bank-';
const trainingPresets = [
  {
    id: 'seed-training-preset-angular-developer',
    name: 'Angular Developer',
    topics: ['JavaScript', 'TypeScript', 'Angular', 'SCSS', 'NgRx'],
  },
];
let prisma;

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new Error(`Cannot build slug for topic "${value}"`);
  }

  return slug;
}

function normalizeTopics(topics) {
  return Array.from(
    new Set(
      topics
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  );
}

function buildSeedId(item) {
  const fingerprint = `${item.text}|${item.topics.join('|')}`;
  const hash = createHash('sha1').update(fingerprint).digest('hex').slice(0, 12);

  return `${SEED_ID_PREFIX}${hash}`;
}

function buildTopicLinks(topics) {
  return topics.map((name) => ({
    topic: {
      connect: {
        id: `seed-topic-${slugify(name)}`,
      },
    },
  }));
}

function buildTrainingPresetTopicLinks(topics) {
  return topics.map((name, index) => ({
    position: index,
    topic: {
      connect: {
        id: `seed-topic-${slugify(name)}`,
      },
    },
  }));
}

function normalizeQuestion(item) {
  const topics = normalizeTopics(item.topics);

  if (!item.text?.trim()) {
    throw new Error('Question text cannot be empty');
  }

  if (!item.answer?.trim()) {
    throw new Error(`Question answer cannot be empty for "${item.text}"`);
  }

  if (topics.length === 0) {
    throw new Error(`Question topics cannot be empty for "${item.text}"`);
  }

  return {
    id: buildSeedId({ ...item, topics }),
    text: item.text.trim(),
    textContent: { text: item.text.trim() },
    answer: item.answer.trim(),
    answerContent: { text: item.answer.trim() },
    difficulty: item.difficulty,
    topics,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
    }),
  });
  const questions = questionBank.map(normalizeQuestion);

  await prisma.$transaction(async (tx) => {
    for (const name of topicsCatalog) {
      const slug = slugify(name);
      const id = `seed-topic-${slug}`;
      const existingById = await tx.topic.findUnique({
        where: { id },
        select: { id: true },
      });

      if (existingById) {
        await tx.topic.update({
          where: { id },
          data: {
            name,
            slug,
          },
        });
        continue;
      }

      const legacyBySlug = await tx.topic.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (legacyBySlug) {
        await tx.topic.update({
          where: { id: legacyBySlug.id },
          data: {
            id,
            name,
            slug,
          },
        });
        continue;
      }

      await tx.topic.create({
        data: {
          id,
          name,
          slug,
        },
      });
    }

    for (const item of questions) {
      const topicLinks = buildTopicLinks(item.topics);

      await tx.question.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          text: item.text,
          textContent: item.textContent,
          answer: item.answer,
          answerContent: item.answerContent,
          difficulty: item.difficulty,
          topics: {
            create: topicLinks,
          },
        },
        update: {
          text: item.text,
          textContent: item.textContent,
          answer: item.answer,
          answerContent: item.answerContent,
          difficulty: item.difficulty,
          topics: {
            deleteMany: {},
            create: topicLinks,
          },
        },
      });
    }

    for (const preset of trainingPresets) {
      await tx.trainingPreset.upsert({
        where: { id: preset.id },
        create: {
          id: preset.id,
          name: preset.name,
          topics: {
            create: buildTrainingPresetTopicLinks(preset.topics),
          },
        },
        update: {
          name: preset.name,
          topics: {
            deleteMany: {},
            create: buildTrainingPresetTopicLinks(preset.topics),
          },
        },
      });
    }
  });

  console.log(`[seed] question bank loaded (${questions.length} records)`);
}

main()
  .catch((error) => {
    console.error('[seed] question bank failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
