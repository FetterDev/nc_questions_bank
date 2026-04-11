# Stitch AI Prompt: полный редизайн Nord

Скопируй текст ниже в Stitch AI без изменений.

---

Ты делаешь **полный продуктовый редизайн** внутреннего приложения **Nord**.

Твоя задача: предложить **новую целостную дизайн-концепцию для всего проекта**, но **не сломать ядро продукта**, его роли, рабочие процессы и ключевые UI-паттерны.

Ниже дана фактическая модель продукта, ролей, процессов и текущего интерфейса. На ее основе спроектируй **новую дизайн-систему, новые key screens, новый shell и новое визуальное направление**.

## 1. Контекст продукта

`Nord` это внутренний инструмент для работы с банком технических вопросов и связанными процессами подготовки.

Продукт включает:
- опубликованный банк технических вопросов;
- controlled-справочники тем и компаний;
- пользовательские заявки на создание, изменение и удаление вопросов;
- менеджерскую модерацию;
- тренировочный контур;
- peer-to-peer тренировки с фидбеком;
- контур внутренних собеседований с weekly cycle, календарем и runtime;
- аналитику роста пользователя и аналитику банка;
- администрирование учетных записей.

Это **не публичный продукт**, **не consumer app** и **не generic SaaS admin panel**.
Это **desktop-first internal knowledge operations workspace**.

## 2. Ключевая доменная модель

Главный объект продукта: **опубликованный вопрос**.

У вопроса есть:
- текст вопроса;
- structured content вопроса;
- текст ответа;
- structured content ответа;
- уровень сложности;
- необязательная компания;
- одна или несколько тем;
- пользовательские отметки `встречал на собесе`.

Вокруг него построены:
- `Topic`
- `Company`
- `QuestionChangeRequest`
- `TrainingPreset`
- `TrainingSession`
- `InterviewCycle`
- `Interview`
- `InterviewQuestion`
- `Analytics`

Важный архитектурный принцип:
- published bank это live-слой;
- история тренировок и интервью строится на snapshots;
- redesign должен учитывать compare/diff patterns, history snapshots и review flows.

## 3. Роли

В продукте **3 роли**, и они **не иерархичны**:
- `USER`
- `MANAGER`
- `ADMIN`

Важно:
- `MANAGER` не равен `ADMIN`;
- `ADMIN` не является надмножеством `MANAGER`;
- нельзя проектировать shell и доступ как классическую схему `admin sees all`.

### USER

Делает:
- смотрит банк вопросов;
- фильтрует и ищет;
- открывает карточку вопроса;
- отмечает `встречал на собесе`;
- создает заявки на новый вопрос, изменение и удаление;
- смотрит только свои заявки;
- проходит тренировки;
- тренирует другого пользователя;
- смотрит историю тренировок;
- смотрит personal growth analytics;
- участвует во внутренних интервью;
- запускает interview runtime, если он interviewer.

### MANAGER

Делает:
- управляет опубликованным банком напрямую;
- модерирует пользовательские заявки;
- управляет темами;
- управляет компаниями;
- управляет тренировочными пресетами;
- управляет weekly cycles интервью;
- управляет парами интервью;
- смотрит manager dashboards;
- смотрит bank analytics.

### ADMIN

Делает:
- управляет пользователями;
- создает учетные записи;
- меняет роли;
- сбрасывает пароли;
- деактивирует и активирует пользователей;
- имеет доступ к CSV import/export question bank.

Не делает:
- не модерирует контент;
- не управляет словарями;
- не ведет manager workflows.

## 4. Основные бизнес-процессы, которые нельзя потерять

Нужно сохранить и явно поддержать в редизайне:

1. **Login / session**
- только внутренний вход;
- нет регистрации;
- логин и пароль выдает админ.

2. **Question bank**
- главный экран продукта;
- поиск, фильтры, пагинация;
- просмотр карточки вопроса;
- для manager доступны row actions;
- для admin важны CSV import/export.

3. **Question details**
- детальный просмотр published question;
- интервью-encounter метка;
- structured content и code blocks.

4. **Question editor**
- один и тот же редактор работает по-разному для `USER` и `MANAGER`;
- `USER` создает заявку;
- `MANAGER` может публиковать напрямую.

5. **Moderation / review queue**
- queue `PENDING`-заявок;
- before/after comparison;
- approve / reject;
- reject требует комментарий;
- это один из core screens.

6. **Topics management**
- controlled vocabulary;
- list/create/rename;
- usage-aware interface.

7. **Companies management**
- controlled vocabulary для компаний;
- list/create/rename.

8. **Users management**
- admin-only;
- список пользователей;
- фильтры;
- create/edit/reset password/activate/deactivate;
- это не HR profile screen, а operational access management.

9. **Training presets**
- manager-only;
- именованные ordered-наборы тем.

10. **Training setup**
- один из core screens;
- выбор режима;
- выбор пресета;
- ручной набор тегов;
- подготовка сессии.

11. **Training runtime**
- карточки вопросов;
- фиксация результата;
- навигация по карточкам;
- сохранение результатов;
- режим self и peer-training.

12. **Training history**
- список сохраненных тренировок;
- деталка сохраненной сессии.

13. **Growth analytics**
- personal screen;
- слабые темы;
- динамика и feedback.

14. **Interview cycles**
- manager calendar;
- weekly cycle;
- planned/scheduled/completed states;
- calendar-based operations.

15. **Interview runtime**
- interviewer проводит интервью;
- snapshot вопросов;
- фиксация результата;
- completion flow.

16. **Interview dashboards**
- manager dashboard;
- user dashboard;
- charts, distributions, operational metrics.

## 5. Текущий визуальный характер, который надо понимать

Сейчас продукт выглядит как:
- светлая paper-based editorial system;
- сухой внутренний инструмент;
- calm operational workspace;
- смесь knowledge tool, moderation console, training cockpit и scheduling UI.

Сильные стороны текущего visual language:
- теплый светлый фон;
- paper / ivory surfaces;
- крупные мягкие панели;
- выразительная типографика заголовков;
- monospace metadata layer;
- аккуратные pills и status semantics;
- shell не спорит с рабочей областью;
- training и analytics уже чуть более выразительны, чем admin flows.

## 6. Что нужно улучшить редизайном

Сделай продукт:
- более цельным;
- более зрелым;
- более premium;
- более системным;
- более уверенным визуально;
- менее переходным;
- более единым между operational screens и training/interview screens.

Но не надо:
- превращать его в generic B2B dashboard;
- делать темный sci-fi интерфейс;
- делать consumer/mobile-first UI;
- уводить все в одинаковые пустые карточки;
- ломать высокоплотные рабочие сценарии.

## 7. Обязательное техническое ограничение: стек и UI library

Это критично.

Проект написан на:
- **Vue 3**
- **Vite**
- **TypeScript**
- **Vue Router**
- **Vuetify 3**

UI library:
- **основная UI-библиотека проекта — Vuetify 3**

Но важно еще сильнее:
- проект **не должен опираться на стандартный внешний вид голого Vuetify**;
- в проекте уже есть **свой UI-слой-обертка поверх Vuetify**, который нужно сохранить и развивать;
- редизайн должен учитывать, что компоненты можно и нужно **глубоко кастомизировать**, а не просто использовать "как есть".

Уже существуют внутренние UI-компоненты-обертки:
- `UiButton`
- `UiIconButton`
- `UiField`
- `UiSelect`
- `UiAutocomplete`
- `UiPanel`
- `UiShellNavItem`

Поэтому:
- предлагай дизайн, который **реально можно реализовать на Vuetify 3 с кастомной темой, CSS variables, overrides и wrapper-компонентами**;
- **не предлагай решения, завязанные на другой UI library**;
- **не проектируй интерфейс так, будто нельзя кастомизировать базовые компоненты**;
- **не ограничивайся стандартными Vuetify паттернами**, если их нужно переосмыслить;
- ориентируйся на **deep customization over Vuetify primitives**.

## 8. Что должно быть в результате

Сделай полный redesign proposal, который включает:

### A. Product-wide design direction
- 2-3 возможных визуальных направления;
- 1 рекомендуемое направление;
- обоснование выбора.

### B. Design principles
- принципы визуального языка;
- принципы иерархии;
- принципы работы с плотными данными;
- принципы role-aware UX;
- принципы compare/review screens;
- принципы calendar/scheduling UI.

### C. Design system
- color system;
- typography system;
- spacing system;
- radius/shadow system;
- surface model;
- states;
- iconography;
- charts style.

### D. Core component inventory
Не упусти core components. Обязательно опиши редизайн для:
- shell / sidebar / topbar / account anchor;
- page header;
- summary cards / metrics strip;
- toolbar with filters and actions;
- data list rows;
- table-like list headers;
- pills / difficulty badges / status badges;
- search field;
- select / autocomplete / textarea / code-aware content block;
- buttons and icon buttons;
- modal/dialog;
- empty states;
- detail cards;
- before/after diff blocks;
- compare panels;
- calendar cells and calendar legend;
- training card / question card;
- interview runtime card;
- chart frames and chart styles;
- pagination;
- destructive confirmations;
- feedback blocks and review comment blocks.

### E. Key screens
Обязательно дай redesign минимум для этих экранов:
- Login
- Bank
- Question details
- Question editor
- My requests
- Review queue
- Topics
- Companies
- Users
- Training presets
- Training setup
- Training runtime
- Training history
- Growth analytics
- Interviews admin calendar
- Interviews dashboard
- My interviews
- My interviews dashboard
- Interview runtime
- Account

### F. Role-aware navigation model
- как должен выглядеть shell для `USER`;
- как должен выглядеть shell для `MANAGER`;
- как должен выглядеть shell для `ADMIN`;
- как визуально показать, что роли разные по модели, а не просто по скрытым пунктам меню.

### G. Responsive strategy
- desktop-first;
- laptop;
- tablet fallback;
- mobile degradation strategy;
- какие экраны должны сохранять плотность;
- какие экраны можно сильнее адаптировать.

### H. Implementation-minded guidance
Сделай результат полезным для дальнейшей реализации во frontend.

Укажи:
- какие части лучше строить через theme tokens;
- какие через CSS variables;
- какие через кастомизацию wrapper-компонентов над Vuetify;
- какие требуют bespoke layout-компонентов;
- где опасно полагаться на стоковый Vuetify rendering.

## 9. Жесткие ограничения для визуального решения

Избегай:
- generic SaaS dashboard aesthetic;
- стандартной `blue-gray-white enterprise admin` эстетики;
- слишком темного интерфейса;
- glossy/dribbblized UI;
- перегруженных glassmorphism-решений;
- тяжелых градиентных hero-блоков;
- карточной каши без иерархии;
- mobile-first упрощения, которое ломает рабочие desktop screens.

Нужно сохранить:
- сухость;
- editorial-характер;
- ощущение paper-based workspace;
- серьезность внутреннего инструмента;
- удобство плотных operational flows;
- ясность в review, training и scheduling screens.

## 10. Что считать успешным результатом

Успешный redesign для Nord это такой redesign, при котором:
- продукт выглядит сильнее и зрелее;
- интерфейс остается внутренним рабочим инструментом, а не маркетинговой витриной;
- role model становится визуально яснее;
- bank / review / training / interviews воспринимаются как части одной системы;
- core components не потеряны;
- дизайн выглядит реализуемым на **Vue 3 + Vuetify 3 + custom wrapper UI layer**;
- есть четкая основа для дальнейшей реализации в существующем проекте.

Теперь на основе всего выше:

1. предложи **3 визуальных направления**;
2. выбери **1 лучшее направление**;
3. собери **полный redesign proposal для всего продукта**;
4. отдельно перечисли **core components, которые нельзя упустить**;
5. отдельно укажи, **как проектировать это с учетом Vuetify 3 и глубокого кастомного UI-слоя**, чтобы команда не потеряла возможность кастомизировать компоненты.

---

Если нужен более короткий вариант prompt для Stitch AI, сначала используй этот полный prompt как master brief, а уже потом сокращай.
