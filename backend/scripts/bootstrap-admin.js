const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const argon2 = require('argon2');

const LOGIN_PATTERN = /^[a-z0-9._-]{3,64}$/;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function normalizeLogin(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function normalizeDisplayName(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw new Error('BOOTSTRAP_ADMIN_DISPLAY_NAME is required');
  }

  return normalized;
}

function validateLogin(value) {
  const normalized = normalizeLogin(value);

  if (!LOGIN_PATTERN.test(normalized)) {
    throw new Error('BOOTSTRAP_ADMIN_LOGIN must match [a-z0-9._-]{3,64}');
  }

  return normalized;
}

function validatePassword(value) {
  const normalized = String(value || '');

  if (
    normalized.length < PASSWORD_MIN_LENGTH ||
    normalized.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `BOOTSTRAP_ADMIN_PASSWORD length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH}`,
    );
  }

  return normalized;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
    }),
  });

  try {
    const login = validateLogin(process.env.BOOTSTRAP_ADMIN_LOGIN);
    const password = validatePassword(process.env.BOOTSTRAP_ADMIN_PASSWORD);
    const displayName = normalizeDisplayName(
      process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME,
    );
    const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
    const forceUpdate =
      String(process.env.BOOTSTRAP_ADMIN_FORCE_UPDATE || '')
        .trim()
        .toLowerCase() === 'true';

    const activeAdmins = await prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const existing = await prisma.user.findUnique({
      where: { login },
    });

    if (activeAdmins === 0 && !existing) {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });

      await prisma.user.create({
        data: {
          login,
          passwordHash,
          displayName,
          email,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          tokenVersion: 0,
        },
      });

      console.log(`[bootstrap-admin] created active admin '${login}'`);
      return;
    }

    if (!existing) {
      console.log('[bootstrap-admin] skipped, active admin already exists');
      return;
    }

    if (!forceUpdate) {
      if (activeAdmins === 0) {
        throw new Error(
          `Bootstrap admin login '${login}' already exists but is not an active admin. Set BOOTSTRAP_ADMIN_FORCE_UPDATE=true.`,
        );
      }

      console.log('[bootstrap-admin] skipped, matching login already exists');
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        displayName,
        email,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        tokenVersion: {
          increment: 1,
        },
      },
    });

    console.log(`[bootstrap-admin] updated admin '${login}'`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[bootstrap-admin] failed');
  console.error(error);
  process.exitCode = 1;
});
