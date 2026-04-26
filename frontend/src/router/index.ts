import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from '../composables/useSession';
import type { SessionRole } from '../features/session/session.types';

function resolveSafeRedirect(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return null;
  }

  return value;
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: {
        title: 'Вход',
      },
    },
    {
      path: '/',
      component: () => import('../layouts/AppShell.vue'),
      children: [
        {
          path: '',
          redirect: { name: 'question-bank' },
        },
        {
          path: 'bank',
          name: 'question-bank',
          component: () => import('../views/QuestionsBankView.vue'),
          meta: {
            roles: ['USER', 'MANAGER', 'ADMIN'] satisfies SessionRole[],
            section: 'bank',
            title: 'Банк вопросов',
            subtitle: 'Опубликованный банк, поиск и действия по текущему опубликованному слою.',
          },
        },
        {
          path: 'question/:id',
          name: 'question-details',
          component: () => import('../views/QuestionDetailsView.vue'),
          meta: {
            roles: ['USER', 'MANAGER', 'ADMIN'] satisfies SessionRole[],
            section: 'bank',
            title: 'Карточка вопроса',
            subtitle: 'Детальный просмотр вопроса, компании и признака того, где он встречался.',
          },
        },
        {
          path: 'bank-analysis',
          name: 'bank-analysis',
          component: () => import('../views/BankAnalysisView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'bank-analysis',
            title: 'Анализ банка вопросов',
            subtitle: 'Операционный анализ текущего опубликованного банка по сложности и покрытию тем.',
          },
        },
        {
          path: 'editor',
          name: 'question-editor-create',
          component: () => import('../views/QuestionEditorView.vue'),
          meta: {
            roles: ['USER', 'MANAGER'] satisfies SessionRole[],
            section: 'editor',
            title: 'Редактор вопроса',
            subtitle: 'Менеджер публикует напрямую, пользователь отправляет заявку на модерацию.',
          },
        },
        {
          path: 'editor/:id',
          name: 'question-editor-edit',
          component: () => import('../views/QuestionEditorView.vue'),
          meta: {
            roles: ['USER', 'MANAGER'] satisfies SessionRole[],
            section: 'editor',
            title: 'Редактор вопроса',
            subtitle: 'Опубликованная версия остаётся неизменной, пока менеджер не применит заявку.',
          },
        },
        {
          path: 'requests',
          name: 'my-requests',
          component: () => import('../views/MyRequestsView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'requests',
            title: 'Мои заявки',
            subtitle: 'Статусы, причины отклонения и точка возврата к собственным изменениям.',
          },
        },
        {
          path: 'review',
          name: 'review-queue',
          component: () => import('../views/ReviewQueueView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'review',
            title: 'Очередь модерации',
            subtitle: 'Side-by-side diff по тексту, тегам и сложности с явным approve/reject.',
          },
        },
        {
          path: 'topics',
          name: 'topics-admin',
          component: () => import('../views/TopicsAdminView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'topics',
            title: 'Темы',
            subtitle: 'Контролируемый словарь тем для поиска, редактора и будущей модерации терминологии.',
          },
        },
        {
          path: 'companies',
          name: 'companies-admin',
          component: () => import('../views/CompaniesAdminView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'companies',
            title: 'Компании',
            subtitle: 'Контролируемый словарь компаний для фильтра банка и связи вопроса с собеседованием.',
          },
        },
        {
          path: 'users',
          name: 'users-admin',
          component: () => import('../views/UsersAdminView.vue'),
          meta: {
            strictRoles: ['ADMIN'] satisfies SessionRole[],
            section: 'users',
            title: 'Пользователи',
            subtitle: 'Админ управляет учётными записями, ролями, паролями и доступом.',
          },
        },
        {
          path: 'growth-card',
          name: 'growth-card',
          component: () => import('../views/GrowthCardView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'growth',
            title: 'Точки роста',
            subtitle: 'История тренировок пользователя, слабые темы и последние результаты по вопросам.',
          },
        },
        {
          path: 'training-history',
          name: 'training-history',
          component: () => import('../views/TrainingHistoryView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'training-history',
            title: 'История тренировок',
            subtitle: 'Сохранённые сессии текущего пользователя с деталями результатов и внешним фидбеком.',
          },
        },
        {
          path: 'training-history/:id',
          name: 'training-history-detail',
          component: () => import('../views/TrainingHistoryView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'training-history',
            title: 'История тренировок',
            subtitle: 'Snapshot отдельной сохранённой сессии и результата по каждому вопросу.',
          },
        },
        {
          path: 'training',
          name: 'training',
          component: () => import('../views/TrainingView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'training',
            title: 'Тренировка',
            subtitle: 'Подбор тем превращается в полноэкранную сессию карточек с сохранением результатов.',
          },
        },
        {
          path: 'training-presets',
          name: 'training-presets',
          component: () => import('../views/TrainingPresetsView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'training-presets',
            title: 'Пресеты тренировок',
            subtitle: 'Менеджер управляет готовыми наборами тем и их порядком для будущих тренировок.',
          },
        },
        {
          path: 'interviews',
          name: 'interviews-admin',
          component: () => import('../views/InterviewsAdminView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'interviews',
            title: 'Собеседования',
            subtitle: 'Weekly cycle, календарь, ручная настройка дат и пресетов.',
          },
        },
        {
          path: 'interviews-dashboard',
          name: 'interviews-dashboard',
          component: () => import('../views/InterviewsDashboardView.vue'),
          meta: {
            strictRoles: ['MANAGER'] satisfies SessionRole[],
            section: 'interviews-dashboard',
            title: 'Dashboard собеседований',
            subtitle: 'План-факт, загрузка интервьюеров и слабые темы.',
          },
        },
        {
          path: 'my-interviews',
          name: 'my-interviews',
          component: () => import('../views/MyInterviewsView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'my-interviews',
            title: 'Мои собеседования',
            subtitle: 'Личный календарь собеседований и запуск runtime как interviewer.',
          },
        },
        {
          path: 'my-interviews-dashboard',
          name: 'my-interviews-dashboard',
          component: () => import('../views/MyInterviewsDashboardView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'my-interviews-dashboard',
            title: 'Статистика собеседований',
            subtitle: 'Interview-only результаты, слабые темы и feedback.',
          },
        },
        {
          path: 'interview-history',
          name: 'interview-history',
          component: () => import('../views/InterviewHistoryView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'interview-history',
            title: 'История собеседований',
            subtitle: 'Завершённые интервью, критерии, комментарии и финальный feedback.',
          },
        },
        {
          path: 'interview-history/:id',
          name: 'interview-history-detail',
          component: () => import('../views/InterviewHistoryView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'interview-history',
            title: 'История собеседований',
            subtitle: 'Detail завершённого интервью с результатами по критериям.',
          },
        },
        {
          path: 'competency-matrix',
          name: 'competency-matrix',
          component: () => import('../views/CompetencyMatrixView.vue'),
          meta: {
            roles: ['USER', 'MANAGER'] satisfies SessionRole[],
            section: 'competency-matrix',
            title: 'Матрица компетенций',
            subtitle: 'Сводка по стеку, компетенциям и результатам завершённых интервью.',
          },
        },
        {
          path: 'interviews/:id/run',
          name: 'interview-runtime',
          component: () => import('../views/InterviewRuntimeView.vue'),
          meta: {
            strictRoles: ['USER'] satisfies SessionRole[],
            section: 'my-interviews',
            title: 'Runtime собеседования',
            subtitle: 'Проведение назначенного интервью и фиксация результатов.',
          },
        },
        {
          path: 'account',
          name: 'account',
          component: () => import('../views/AccountView.vue'),
          meta: {
            roles: ['USER', 'MANAGER', 'ADMIN'] satisfies SessionRole[],
            section: 'account',
            title: 'Аккаунт',
            subtitle: 'Профиль текущей сессии, статус доступа и выход из системы.',
          },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'question-bank' },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const { isAuthenticated, loadSession, profile } = useSession();

  if (to.name === 'login') {
    if (!isAuthenticated.value) {
      return true;
    }

    try {
      await loadSession();
    } catch {
      return true;
    }

    if (!profile.value) {
      return true;
    }

    return resolveSafeRedirect(to.query.redirect) ?? { name: 'question-bank' };
  }

  if (!isAuthenticated.value) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  try {
    await loadSession();
  } catch {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  const currentRole = profile.value?.role;

  if (!currentRole) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  const strictRoles = Array.isArray(to.meta.strictRoles)
    ? (to.meta.strictRoles as SessionRole[])
    : undefined;

  if (strictRoles && strictRoles.length > 0) {
    return strictRoles.includes(currentRole) ? true : { name: 'question-bank' };
  }

  const allowedRoles = Array.isArray(to.meta.roles)
    ? (to.meta.roles as SessionRole[])
    : undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(currentRole) ? true : { name: 'question-bank' };
});

export { router };
