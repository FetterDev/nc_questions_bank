import { expect, test, type Page } from '@playwright/test';

const adminProfile = {
  id: 'admin-id',
  login: 'nord.admin',
  email: 'nord.admin@example.com',
  displayName: 'Nord Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const userProfile = {
  id: 'user-id',
  login: 'nord.user',
  email: 'nord.user@example.com',
  displayName: 'Nord User',
  role: 'USER',
  status: 'ACTIVE',
};

const managerProfile = {
  id: 'manager-id',
  login: 'nord.manager',
  email: 'nord.manager@example.com',
  displayName: 'Nord Manager',
  role: 'MANAGER',
  status: 'ACTIVE',
};

async function mockLoginFlow(
  page: Page,
  options: {
    token: string;
    profile: typeof adminProfile | typeof managerProfile | typeof userProfile;
  },
) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: options.token,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        profile: options.profile,
      }),
    });
  });

  await page.route('**/api/me', async (route) => {
    const authorization = route.request().headers().authorization;

    if (authorization === `Bearer ${options.token}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.profile),
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });
}

function createBankQuestion() {
  return {
    id: 'question-prisma-search',
    text: 'Почему сложный поиск в сервисе нельзя оставлять на Prisma query builder?',
    textContent: {
      text: 'Почему сложный поиск в сервисе нельзя оставлять на Prisma query builder?',
      code: 'const results = await prisma.question.findMany({ where, orderBy });',
      codeLanguage: 'typescript',
    },
    answer: 'Потому что ранжирование и FTS должны жить в SearchRepository.',
    answerContent: {
      text: 'Потому что ранжирование и FTS должны жить в SearchRepository.',
    },
    difficulty: 'senior',
    topics: [
      { id: 'topic-prisma', name: 'Prisma', slug: 'prisma' },
      { id: 'topic-search', name: 'Search', slug: 'search' },
    ],
    createdAt: '2026-03-06T09:00:00.000Z',
    updatedAt: '2026-03-08T09:00:00.000Z',
    pendingChangeRequest: {
      hasPendingChangeRequest: false,
      hasMyPendingChangeRequest: false,
    },
    interviewEncounter: {
      count: 2,
      checkedByCurrentUser: false,
    },
  };
}

async function mockBankFlow(
  page: Page,
  options: {
    profile: typeof adminProfile | typeof managerProfile | typeof userProfile;
  },
) {
  const question = createBankQuestion();
  const topics = [
    { id: 'topic-prisma', name: 'Prisma', slug: 'prisma', questionsCount: 7 },
    { id: 'topic-search', name: 'Search', slug: 'search', questionsCount: 11 },
  ];
  let requestSubmitted = false;

  await page.addInitScript((token) => {
    window.localStorage.setItem('nord.access.token', token);
  }, `${options.profile.role.toLowerCase()}-bank-token`);

  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.profile),
    });
  });

  await page.route('**/api/topics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: topics,
        total: topics.length,
        meta: {
          tookMs: 4,
          appliedFilters: {
            q: null,
            usedOnly: route.request().url().includes('usedOnly=true'),
          },
        },
      }),
    });
  });

  await page.route('**/api/companies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        total: 0,
        meta: {
          tookMs: 3,
          appliedFilters: {
            q: null,
          },
        },
      }),
    });
  });

  await page.route('**/api/search/questions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [question],
        total: 1,
        meta: {
          tookMs: 8,
          appliedFilters: {
            difficulty: [],
            topicIds: [],
            sort: 'newest',
          },
        },
      }),
    });
  });

  await page.route(`**/api/questions/${question.id}/interview-encounter`, async (route) => {
    if (route.request().method() === 'PUT') {
      question.interviewEncounter = {
        count: 3,
        checkedByCurrentUser: true,
      };
    }

    if (route.request().method() === 'DELETE') {
      question.interviewEncounter = {
        count: 2,
        checkedByCurrentUser: false,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(question.interviewEncounter),
    });
  });

  await page.route(`**/api/questions/${question.id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      question.text = payload.textContent.text;
      question.textContent = payload.textContent;
      question.answer = payload.answerContent.text;
      question.answerContent = payload.answerContent;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(question),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(question),
    });
  });

  await page.route('**/api/question-change-requests', async (route) => {
    requestSubmitted = true;
    question.pendingChangeRequest = {
      hasPendingChangeRequest: true,
      hasMyPendingChangeRequest: true,
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'request-question-update',
      }),
    });
  });

  return {
    getRequestSubmitted: () => requestSubmitted,
  };
}

test('redirects unauthenticated user from protected route to login', async ({ page }) => {
  await page.goto('/bank');
  await expect(page).toHaveURL(/\/login\?redirect=\/bank$/);
});

test('admin login opens shell and shows users section', async ({ page }) => {
  await mockLoginFlow(page, {
    token: 'admin-token',
    profile: adminProfile,
  });

  await page.goto('/login');
  await page.getByPlaceholder('nord.admin').fill(adminProfile.login);
  await page.getByPlaceholder('Введите пароль').fill('admin-password-2026');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/bank$/);
  await expect(page.getByText('Пользователи')).toBeVisible();

  await page.goto('/users');
  await expect(page).toHaveURL(/\/users$/);
});

test('manager login opens shell and shows manager sections without users section', async ({ page }) => {
  await mockLoginFlow(page, {
    token: 'manager-token',
    profile: managerProfile,
  });
  await page.route('**/api/question-change-requests/review**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        total: 0,
      }),
    });
  });

  await page.goto('/login');
  await page.getByPlaceholder('nord.admin').fill(managerProfile.login);
  await page.getByPlaceholder('Введите пароль').fill('manager-password-2026');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/bank$/);
  await expect(page.getByText('Модерация')).toBeVisible();
  await expect(page.getByText('Пользователи')).toHaveCount(0);

  await page.goto('/review');
  await expect(page).toHaveURL(/\/review$/);
});

test('user login hides users section and cannot stay on admin route', async ({ page }) => {
  await mockLoginFlow(page, {
    token: 'user-token',
    profile: userProfile,
  });

  await page.goto('/login');
  await page.getByPlaceholder('nord.admin').fill(userProfile.login);
  await page.getByPlaceholder('Введите пароль').fill('user-password-2026');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/bank$/);
  await expect(page.getByText('Пользователи')).toHaveCount(0);

  await page.goto('/users');
  await expect(page).toHaveURL(/\/bank$/);
});

test('401 on session load clears token and redirects to login', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nord.access.token', 'stale-token');
  });

  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });

  await page.goto('/bank');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fbank$/);
});

test('account view is read-only and has logout only', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nord.access.token', 'admin-token');
  });

  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminProfile),
    });
  });

  await page.goto('/account');

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
  await expect(page.getByText('Переключатель нужен только для dev-режима')).toHaveCount(0);
  await expect(page.getByLabel('Роль')).toHaveCount(0);
  await expect(page.getByLabel('Пароль')).toHaveCount(0);
});

test('user bank hides actions and submits edit via change request from editor route', async ({ page }) => {
  const bank = await mockBankFlow(page, {
    profile: userProfile,
  });

  await page.goto('/bank');

  await expect(page.getByText('Действия')).toHaveCount(0);
  await page.getByRole('button', {
    name: /Вопрос Почему сложный поиск в сервисе нельзя оставлять на Prisma query builder/,
  }).click();

  await expect(page).toHaveURL(/\/question\/question-prisma-search$/);
  const encounterCount = page
    .locator('.summary-stat')
    .filter({ hasText: 'Встречал на собесе' })
    .getByRole('strong');

  await expect(encounterCount).toHaveText('2 раза');
  await page.getByLabel('Отметить для себя').click();
  await expect(encounterCount).toHaveText('3 раза');
  await page.getByRole('button', { name: 'Отправить правку' }).click();
  await expect(page).toHaveURL(/\/editor\/question-prisma-search$/);
  await expect(page.getByRole('heading', { name: 'Правка вопроса' })).toBeVisible();

  await page.locator('textarea').first().fill('Обновленный вопрос из modal');
  await page.getByRole('button', { name: 'Отправить правку' }).click();

  await expect(page).toHaveURL(/\/requests\?selected=request-question-update$/);
  expect(bank.getRequestSubmitted()).toBeTruthy();
});

test('manager bank shows actions and edit action opens editor route in edit mode', async ({ page }) => {
  await mockBankFlow(page, {
    profile: managerProfile,
  });

  await page.goto('/bank');

  await expect(page.getByText('Действия')).toBeVisible();
  await page.getByRole('button', { name: 'Изменить вопрос' }).click();
  await expect(page).toHaveURL(/\/editor\/question-prisma-search$/);
  await expect(page.getByRole('heading', { name: 'Редактирование вопроса' })).toBeVisible();

  await page.locator('textarea').first().fill('Admin updated question');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();

  await expect(page.getByText('Изменения сохранены.')).toBeVisible();
});

test('admin bank does not show manager actions', async ({ page }) => {
  await mockBankFlow(page, {
    profile: adminProfile,
  });

  await page.goto('/bank');

  await expect(page.getByText('Действия')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Изменить вопрос' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Удалить вопрос' })).toHaveCount(0);
});
