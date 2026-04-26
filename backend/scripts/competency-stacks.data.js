const competencyStacks = [
  {
    name: 'React',
    competencies: [
      {
        name: 'React fundamentals',
        description: 'Компоненты, props, локальное состояние и базовые React-паттерны.',
        position: 1,
        sourceTopics: ['React'],
      },
      {
        name: 'State management',
        description: 'Локальное и глобальное состояние, Flux, Redux, RTK и Zustand.',
        position: 2,
        sourceTopics: ['React', 'State Management', 'Flux', 'Redux', 'RTK', 'Zustand'],
      },
      {
        name: 'Routing',
        description: 'Клиентская навигация, history state и route-level состояние.',
        position: 3,
        sourceTopics: ['React', 'Routing'],
      },
      {
        name: 'Server state',
        description: 'React Query, кэширование, query keys и инвалидация серверных данных.',
        position: 4,
        sourceTopics: ['React Query', 'Server State'],
      },
      {
        name: 'TypeScript',
        description: 'Типизация компонентов, контрактов и состояния приложения.',
        position: 5,
        sourceTopics: ['TypeScript'],
      },
      {
        name: 'Frontend platform',
        description: 'HTML, CSS, JavaScript и Browser APIs как основа React-приложения.',
        position: 6,
        sourceTopics: ['HTML', 'CSS', 'JavaScript', 'Browser APIs'],
      },
      {
        name: 'Performance and tooling',
        description: 'Оптимизация рендера, производительность браузера и инструментирование.',
        position: 7,
        sourceTopics: ['Performance', 'Tooling'],
      },
    ],
  },
  {
    name: 'Angular',
    competencies: [
      {
        name: 'Angular fundamentals',
        description: 'Standalone components, DI, template syntax и базовая модель Angular.',
        position: 1,
        sourceTopics: ['Angular'],
      },
      {
        name: 'TypeScript',
        description: 'Строгая типизация моделей, сервисов, компонентов и публичных API.',
        position: 2,
        sourceTopics: ['TypeScript'],
      },
      {
        name: 'Async and RxJS foundations',
        description: 'Асинхронный JavaScript, promises и event loop как база reactive-flow.',
        position: 3,
        sourceTopics: ['Async', 'Promises', 'Event Loop', 'JavaScript'],
      },
      {
        name: 'NgRx',
        description: 'Store, actions, reducers, effects и selectors для Angular-приложений.',
        position: 4,
        sourceTopics: ['NgRx', 'State Management', 'Flux'],
      },
      {
        name: 'Templates and styling',
        description: 'HTML, CSS и SCSS для компонентной верстки и дизайн-систем.',
        position: 5,
        sourceTopics: ['HTML', 'CSS', 'SCSS'],
      },
      {
        name: 'Routing and integration',
        description: 'Навигация, guards/resolvers и интеграция Angular с внешним контуром.',
        position: 6,
        sourceTopics: ['Angular', 'Routing', 'Integration'],
      },
      {
        name: 'Performance and tooling',
        description: 'Производительность, сборка и поддерживаемость Angular-приложений.',
        position: 7,
        sourceTopics: ['Performance', 'Tooling'],
      },
    ],
  },
  {
    name: 'Vue',
    competencies: [
      {
        name: 'Vue fundamentals',
        description: 'Компонентная модель Vue поверх HTML, CSS и JavaScript.',
        position: 1,
        sourceTopics: ['HTML', 'CSS', 'JavaScript'],
      },
      {
        name: 'TypeScript',
        description: 'Типизация компонентов, composables, props и событий.',
        position: 2,
        sourceTopics: ['TypeScript'],
      },
      {
        name: 'State management',
        description: 'Локальное состояние, shared state и однонаправленные state-паттерны.',
        position: 3,
        sourceTopics: ['State Management', 'Flux'],
      },
      {
        name: 'Routing and browser integration',
        description: 'SPA-навигация, history state, Browser APIs и интеграционные границы.',
        position: 4,
        sourceTopics: ['Routing', 'Browser APIs', 'Integration'],
      },
      {
        name: 'Server state and networking',
        description: 'Fetch, networking и кэширование серверных данных во frontend-приложении.',
        position: 5,
        sourceTopics: ['Fetch', 'Networking', 'Server State'],
      },
      {
        name: 'Templates and styling',
        description: 'HTML, CSS и SCSS для компонентной верстки Vue-интерфейсов.',
        position: 6,
        sourceTopics: ['HTML', 'CSS', 'SCSS'],
      },
      {
        name: 'Performance and tooling',
        description: 'Оптимизация браузерной производительности и tooling frontend-сборки.',
        position: 7,
        sourceTopics: ['Performance', 'Tooling'],
      },
    ],
  },
];

module.exports = {
  competencyStacks,
};
