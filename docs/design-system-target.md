# Цель дизайн-системы UI

Дата: 2026-05-04

Статус: целевое описание для полного редизайна. Это не changelog. Документ фиксирует, к какому виду надо привести весь frontend после отказа от стерильного neutral-only варианта.

## Цель

Привести приложение к современному product-console интерфейсу без смены пользовательских сценариев, API-контрактов и смыслов экранов. Визуальное направление: Nord Command Console, контрастный темный rail, светлая рабочая область, выразительные акценты, плотные данные, явная иерархия, аккуратная глубина.

Дизайн должен ощущаться как зрелый рабочий инструмент для банка вопросов, тренировок, интервью, модерации и аналитики. Не как пустой white-label admin template, не как landing page, не как набор одинаковых серо-белых карточек.

## Принципы

1. **Характер вместо стерильности.** У интерфейса должен быть запоминаемый каркас: темный rail, сильный topbar, контрастные primary actions, живые status states.
2. **Плотность без тесноты.** Экран должен показывать больше полезных данных, но не за счет наложений, мелкого текста или случайных переносов.
3. **Одна система поверхностей.** Все панели, таблицы, формы, diff-карточки, пустые состояния и загрузка используют один набор токенов поверхностей.
4. **Роль действия очевидна.** Primary используется только для главного действия экрана или блока. Secondary и ghost не конкурируют с primary.
5. **Цвет несет смысл и ритм.** Teal = действие/focus/active, lime = короткий акцент rail/brand, amber/coral/plum = status/semantic accents. Не заливать весь экран одним оттенком.
6. **Mobile first для плотных рабочих сценариев.** На мобильном экран не должен превращаться в бесконечную стопку из-за sidebar, пустых состояний или слишком крупных заголовков.
7. **Не менять UX по пути.** Перестановка сценариев, прав доступа и API не является частью дизайн-системы.

## Целевой фундамент

### Цвета

Текущая целевая база задана в `frontend/src/styles/foundation/tokens.css` и должна стать единственным источником визуальных решений:

- Page background: `--color-paper: #edf1f5`.
- Основная поверхность: `--color-ivory: #ffffff`.
- Primary text: `--color-ink: #101828`.
- Secondary text: `--color-ink-muted: #65758b`.
- Teal для действий: `--color-cyan: #008f8c`, hover `#007471`.
- Темный rail: `--color-graphite: #121a22`, `--color-graphite-2: #1c2732`.
- Дополнительные акценты: `--color-lime`, `--color-plum`, `--color-coral`.
- Border: `--panel-border: #d3dbe6`.
- Приглушенная поверхность таблиц/заголовков: `--table-header-bg: #e8eef5`.
- Field border: `--field-border: #c9d4df`, focus `--field-border-focus: var(--color-cyan)`.

Правила:

- Белая поверхность (`#ffffff`) используется для основных панелей, карточек, форм, table surface, detail surface.
- Приглушенная поверхность (`#f8fafc` или token-эквивалент) используется только для вложенных/неактивных блоков, empty/loading и вторичных панелей.
- `color-mix(... paper ... ivory ...)` не должен быть локальной привычкой в feature CSS. Если нужен новый оттенок, его надо завести как token.
- Цвета статусов используются только для состояния: success, warning, danger, review status, training result, difficulty.
- Teal можно использовать как сильный nav/action gradient, но не как единственную палитру интерфейса.

### Типографика

Текущая база:

- UI/body/display: `Manrope`.
- Code/labels: `JetBrains Mono`.
- Display: 32px.
- H1: 28px.
- H2: 21px.
- Body: 16px.
- Small: 14px.
- Base line-height: 1.4.

Правила:

- Letter spacing для обычных заголовков: `0`.
- Uppercase mono labels допустимы только для технических labels: `ВОПРОС`, `ОТВЕТ`, `СЛОЖНОСТЬ`, `СТАТУС`, table headers, metadata labels.
- Не использовать hero-scale headings внутри панелей, карточек, sidebars и compact forms.
- На mobile H1 внутри рабочих экранов должен понижаться до H2-scale, если заголовок длиннее одной строки.
- Длинные русские заголовки должны переноситься без перекрытий с кнопками и chips.

### Радиусы

Целевая шкала:

- Panel/card: `8px`.
- Controls: `8px`.
- Chips/pills: `6px`, кроме аватаров и круглых counters.
- Dialogs: `8px`.

Правила:

- Не использовать `calc(var(--panel-radius) - Npx)`: при изменении шкалы это дает нули или отрицательные значения.
- Нельзя смешивать мягкие 18-24px карточки с enterprise 8px системой.

### Тени и границы

Цель:

- Основная читаемость строится на границе, не на тяжелой тени.
- `--shadow-overlay` используется для легкого separation.
- `--shadow-floating-card` только для overlays/dialogs/popovers, где нужна реальная глубина.

Правила:

- Таблицы, панели, формы и stat cards: border + очень легкая shadow.
- Вложенные cards: border only или muted surface.
- Hover не должен создавать сильную elevation. Достаточно border/fill shift.

### Отступы и плотность

Текущая база:

- Shell padding: 20px.
- Frame gap: 16px.
- Panel padding: 22px.
- Compact padding: 16px.
- Control height: 48px.
- Sidebar width: 252px.
- Min touch target: 40px.

Цель:

- Рабочие desktop-экраны используют ритм 16px.
- Компактные строки таблиц/списков не ниже 64px, если в строке есть rich content.
- Forms сохраняют 48px controls, но секции не должны становиться слишком высокими из-за лишних wrappers.
- Empty states в feature panels: 140-170px, не 220px по умолчанию, если блок не является главным экранным состоянием.

## Цели по компонентам

### App Shell

Цель:

- Sidebar компактный, стабильный, без визуальной тяжести.
- Active item: teal left rail + restrained text/icon emphasis.
- Top account block не должен выглядеть как отдельная floating card на каждом экране.
- Mobile nav: горизонтальный scroll, занимает одну компактную полосу, не съедает первый экран.

Что выровнять:

- Проверить все роли: ADMIN, MANAGER, USER. У каждой роли разный nav footprint.
- Убрать ситуации, где mobile сначала показывает только logo/nav/account и откладывает основной контент ниже fold.
- Account summary в topbar сделать визуально легче: avatar + name/role без лишней карточности.

### Page Frame

Цель:

- Каждый экран начинается с понятного рабочего heading или сразу с основного workflow, если heading уже есть в shell.
- Summary metrics: единый компонент stat card.
- Toolbar: единая grid-сетка, actions внутри toolbar, без больших пустых footer-блоков.

Что выровнять:

- Убрать разные размеры H1 на feature screens.
- Унифицировать `summary-strip`, `metrics-grid`, `toolbar-panel`, `table-frame`.
- Проверить, что `page-frame--narrow` не создает странный пустой правый край на editor/account.

### Buttons

Цель:

- Primary solid teal.
- Secondary white with border.
- Ghost/text только для low-emphasis действий.
- Danger red только для destructive.

Что выровнять:

- В каждом action group только один primary.
- На mobile action buttons допускают wrap, но текст не должен обрезаться.
- Dialog action footer: primary справа, secondary слева/рядом, danger clearly separated where destructive.
- Иконки должны быть одинакового размера и не менять высоту кнопки.

### Fields, Selects, Autocomplete

Цель:

- Белый фон, четкий border, teal focus.
- Placeholder muted, но читаемый.
- Chips внутри autocomplete не ломают высоту поля непредсказуемо.

Что выровнять:

- Все selects/autocomplete должны иметь одинаковую высоту в toolbar.
- Multi-select chips на mobile не должны делать field высотой на полэкрана.
- Error/hint spacing должен быть одинаковым в editor, training setup, admin CRUD dialogs.

### Tables and Lists

Цель:

- Table/list surfaces выглядят как рабочие данные, не как набор отдельных больших карточек.
- Headers muted, mono uppercase, stable height.
- Rich rows на desktop используют grid columns; на mobile превращаются в cards.

Что выровнять:

- Company chips в question rows сейчас выглядят как full-width strip на mobile/desktop. Нужно привести к обычному chip/token.
- Code blocks внутри rows должны иметь max-width и horizontal scroll, не обрезать синтаксис.
- Encounter counters, status chips, difficulty tags должны быть одной системы размера.

### Chips, Badges, Status

Цель:

- Difficulty tags: junior/success, middle/warning, senior/danger, lead/purple.
- Topic chips: neutral gray.
- Company chips: muted teal/info, но не full-width strip.
- Status chips: pending/waiting neutral, approved/success, rejected/danger.

Что выровнять:

- Сейчас topic chips, company chips и status chips местами похожи на разные компоненты.
- `На проверке`, `не засчитано`, `ожидает`, role badges должны иметь общую высоту, radius, padding.
- Chips не должны переноситься так, чтобы ломать строку действий.

### Code Blocks

Цель:

- Code block = bordered muted surface, mono, compact line numbers, horizontal scroll.
- В таблицах и mobile cards код ограничен по высоте и не растягивает весь экран.

Что выровнять:

- Mobile bank/review/growth показывают код, который визуально обрезается по ширине.
- Нужно единое правило: `overflow-x: auto`, stable max-width, no layout shift.
- В training active код в карточке должен не конкурировать с основным вопросом.

### Empty and Loading States

Цель:

- Empty state сообщает отсутствие данных, но не доминирует.
- Loading state компактный, не выглядит как огромная пустая карточка.

Что выровнять:

- Review empty desktop сейчас оставляет слишком много пустой области.
- Growth empty panels на desktop/mobile занимают много высоты.
- Все empty states должны иметь одинаковый label/body hierarchy.

### Dialogs and Overlays

Цель:

- Dialog surface: white, 8px radius, predictable width, clear action footer.
- Backdrop restrained, no heavy blur.

Что выровнять:

- Training exit dialog: кнопка `Выйти с сохранением` на desktop обрезается/выглядит disabled cramped. Нужно переразложить footer.
- CRUD dialogs для topics/companies/users/presets/interviews должны использовать те же title/body/footer rules.

## Цели по экранам

### Login

Покрытие snapshot: нет.

Цель:

- Сделать login частью той же DS: neutral page, white auth panel, teal primary, clear field states.
- Без marketing hero и декоративных фонов.
- Error state и loading state должны совпадать с общими alert/button rules.

Нужно сделать:

- Добавить snapshot для `/login`.
- Проверить mobile: форма должна быть видна без лишнего vertical chrome.

### Bank (`/bank`)

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop toolbar стал лучше: actions внутри grid.
- Mobile bank все еще длинный из-за полной стопки фильтров.
- Company в row выглядит как широкая colored strip.
- Code blocks в row могут быть визуально обрезаны.

Цель:

- Desktop: плотный search/table workflow с compact toolbar.
- Mobile: сначала summary, потом фильтры компактнее, потом cards.
- Table rows должны быть читаемыми: вопрос, optional code, company, difficulty, topics, encounter.

Нужно сделать:

- Company chip привести к `v-chip`/shared chip, не full-width strip.
- Для mobile toolbar рассмотреть collapsible filters или двухуровневую сетку: search всегда виден, advanced filters ниже.
- В table rows ограничить code block height и включить horizontal scroll.
- Уточнить empty/loading для table: compact state внутри table surface.

### Question Details (`/question/:id`)

Покрытие snapshot: нет.

Цель:

- Detail screen должен совпадать с bank row и editor preview: одинаковые rendering rules для text/code/topics/company/difficulty.
- Actions `Редактировать`, `Отправить правку`, encounter toggle должны быть visually grouped.

Нужно сделать:

- Добавить snapshot для manager/user/admin.
- Проверить pending change request state.
- Проверить mobile action footer.

### Bank Analysis (`/bank-analysis`)

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop readable, но нижние analytic cards выглядят менее системно, чем top metric cards.
- Action pills в insight cards иногда выглядят как status chips.

Цель:

- Операционная analytics dashboard: metrics -> insights -> distributions.
- Insight cards должны иметь clear hierarchy: label, finding, source, action.
- Distribution cards должны быть compact and scan-friendly.

Нужно сделать:

- Развести visual language `recommendation action` и `status chip`.
- Выровнять высоты insight cards.
- Проверить mobile stacking и button width.

### Editor Create/Edit (`/editor`, `/editor/:id`)

Покрытие snapshot: edit desktop/mobile.

Текущее состояние:

- Desktop editor стал чище, но форма длинная и section hierarchy слабая.
- Mobile editor очень длинный; buttons `Добавить текст/код` занимают много вертикали.
- Difficulty toggle на mobile занимает две строки.
- Criteria editor на mobile тяжелый.

Цель:

- Editor = structured form, где блоки вопроса/ответа, meta и criteria читаются как отдельные рабочие секции.
- Preview должен быть полезным, не декоративным.
- Mobile должен оставаться заполняемым без чрезмерного scrolling.

Нужно сделать:

- Уточнить section cards: `Вопрос`, `Ответ`, `Сложность и темы`, `Компетенции и критерии`, `Предпросмотр`.
- Header actions `Добавить текст/код` на mobile сделать compact segmented action row или icon+label controls.
- Difficulty toggle сделать stable 4-option segmented control, на mobile 2x2 без странных разрывов.
- Criteria rows: desktop grid; mobile stacked fields с compact labels.
- Sticky bottom action footer на mobile рассмотреть только если не перекрывает content.

### My Requests (`/requests`)

Покрытие snapshot: нет.

Цель:

- User-facing moderation history: list/detail pattern как review, но read-only и легче.
- Status chips должны совпадать с review status.

Нужно сделать:

- Добавить snapshots: empty, pending, rejected/approved detail.
- Убрать расхождения с review diff cards.

### Review Queue (`/review`)

Покрытие snapshot: desktop/mobile filled/empty.

Текущее состояние:

- Desktop split view правильный, но правая колонка перегружена heading/chips/meta/diff summary.
- Mobile корректно складывается, но очень длинный.
- Review empty desktop слишком пустой.
- Diff cards используют базовую систему, но требуют сильнее выраженной before/after hierarchy.

Цель:

- Manager review = dense moderation workspace.
- Left queue: compact list, selected state clear.
- Right detail: header -> meta -> before/after -> changed fields -> decision.
- Before/after columns должны быть сравнимыми по структуре и не расползаться.

Нужно сделать:

- Сделать sticky/visible decision footer на desktop в пределах detail panel или закрепить actions внизу секции.
- Уменьшить meta cards или превратить в compact meta strip.
- В before/after добавить consistent section dividers.
- Empty state сделать compact и aligned with split workspace.
- Code block scroll on mobile.

### Topics (`/topics`) and Companies (`/companies`)

Покрытие snapshot: нет.

Цель:

- Admin dictionary screens должны быть максимально плотными: toolbar, table/list, create/edit dialog.
- Topics and Companies должны выглядеть одинаково.

Нужно сделать:

- Добавить snapshots для list, empty, dialog open.
- Использовать один CRUD list pattern.
- Actions edit/delete должны быть icon buttons with tooltip/label, not inconsistent text buttons.

### Users (`/users`)

Покрытие snapshot: нет.

Цель:

- Admin user management = data table with role/status/actions.
- Role/status chips use shared status system.

Нужно сделать:

- Добавить snapshots for ADMIN.
- Проверить disable/activate/reset password dialogs.
- Выровнять toolbar actions и table density с bank/admin dictionaries.

### Growth Card (`/growth-card`)

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop layout работает, но много больших empty panels.
- Mobile очень длинный.
- Mock/data показывает `undefined частично`; это data formatting issue, но визуально портит экран.
- Right result cards с danger borders тяжелые.

Цель:

- Growth screen = personal analytics dashboard, not report dump.
- Верхние metrics compact.
- Recommendations/comments empty states compact.
- Latest results grouped by status but not visually shouting unless action required.

Нужно сделать:

- Исправить data formatting для partial count или mock fixtures, чтобы не было `undefined`.
- Уменьшить empty panels до 140-150px.
- Latest result cards: danger/success as status accent, not full red-card feeling.
- Mobile: combine metrics into 2-column where possible or more compact stacked cards.
- Long headings reduce to H2 on mobile.

### Training Setup (`/training` before session)

Покрытие snapshot: нет отдельного setup state; active/exit covered.

Цель:

- Setup is a selection workflow: mode -> recipient if needed -> preset -> selected tags -> available tags -> prepare.
- Should be compact and clear.

Нужно сделать:

- Добавить snapshot для setup state.
- Preset select и selected tags должны быть заметными, но не огромными.
- Available tags должны использовать compact selectable cards или chips.
- Prepare action должен быть визуально связан с selected set.

### Training Active (`/training` active)

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop card has too much empty vertical space.
- Top state is readable.
- Navigation arrows sit far away from content.
- Main question scale is large but acceptable; needs better vertical balance.

Цель:

- Training active = focused card experience, but still enterprise-clean.
- Question card должна выглядеть центрированной и намеренно собранной, не пустой.
- Answer reveal/skip actions должны быть стабильными и заметными.

Нужно сделать:

- Reduce training card min-height or add internal vertical layout that balances content.
- Move prev/next navigation closer to card or make them part of top/bottom navigation.
- If answer/code is hidden, use balanced placeholder area, not empty void.
- Mobile active state must keep primary action above fold after card header.

### Training Exit Dialog

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop footer button text is cramped/truncated.
- Dialog content is clear but action hierarchy can improve.

Цель:

- Exit dialog actions must be unmistakable: stay, exit without saving, save and exit.
- Disabled save action must explain why, if disabled.

Нужно сделать:

- Footer layout: allow wrap, full labels, no clipped text.
- Use danger/secondary/primary hierarchy consistently.
- Mobile dialog buttons stack full-width.

### Training History (`/training-history`, `/training-history/:id`)

Покрытие snapshot: нет.

Цель:

- User can scan sessions, open detail, understand result breakdown.
- Same result cards as growth and training active.

Нужно сделать:

- Добавить snapshots list/detail/empty.
- Align status/result badges with growth cards.
- Ensure detail split works on mobile.

### Training Presets (`/training-presets`)

Покрытие snapshot: нет.

Цель:

- CRUD пресетов для менеджера должен совпадать с admin-экранами справочников, но учитывать ordered topic builder.

Нужно сделать:

- Добавить snapshots list/dialog.
- Ordered topic builder привести к единым строкам/карточкам; drag/order controls, если они есть, должны быть теми же control primitives.
- Footer диалога и topic chips выровнять с editor/training setup.

### Team Dashboard (`/team`)

Покрытие snapshot: нет.

Цель:

- Дашборд команды для менеджера должен использовать тот же analytics language, что `bank-analysis` и `growth`.
- Таблица сотрудников должна быть плотной, читаемой и выглядеть готовой к сортировке/фильтрации.

Нужно сделать:

- Добавить snapshots для manager dashboard.
- Chips/status/progress bars в строках сотрудников привести к стилю growth.
- Toolbar фильтров выровнять с bank toolbar.

### Employee Interview History (`/team/:userId/interview-history`, detail)

Покрытие snapshot: нет.

Цель:

- Тот же визуальный pattern, что user interview history, но с компактным manager context.

Нужно сделать:

- Добавить snapshots.
- Контекст выбранного сотрудника должен быть видимым, но компактным.
- Detail cards выровнять с interview detail/runtimes.

### Interviews Admin (`/interviews`)

Покрытие snapshot: нет.

Цель:

- Calendar/list/admin cycle management должен ощущаться как компактный операционный workflow.
- Pair dialog должен совпадать с целевыми правилами forms/dialogs.

Нужно сделать:

- Добавить snapshots для calendar/list и pair dialog.
- Calendar cells должны иметь четкие состояния без тяжелых цветных заливок.
- Table/list actions использовать как icon buttons.

### Interviews Dashboard (`/interviews-dashboard`)

Покрытие snapshot: нет.

Цель:

- Analytics dashboard должен совпадать с bank-analysis/team/growth.

Нужно сделать:

- Metrics, charts, weak topics, interviewer load используют единые cards/progress/chips.
- Empty/loading states компактные.

### My Interviews (`/my-interviews`) and My Interviews Dashboard

Покрытие snapshot: нет.

Цель:

- Пользовательские schedule/stats должны повторять manager analytics там, где это уместно, но с более простыми действиями.

Нужно сделать:

- Добавить snapshots list/calendar/dashboard.
- Launch interview action должен быть primary и очевидным.
- Personal dashboard cards выровнять с growth.

### Interview History (`/interview-history`, detail)

Покрытие snapshot: нет.

Цель:

- Read-only history: list/detail pattern, compact results, criteria breakdown.

Нужно сделать:

- Добавить snapshots list/detail/empty.
- Result chips и criterion cards выровнять с training history/growth.

### Interview Runtime (`/interviews/:id/run`)

Покрытие snapshot: нет.

Цель:

- Runtime должен быть сфокусированным как training active, но с interview criteria и comments.

Нужно сделать:

- Добавить snapshots active, criteria scoring, completion dialog.
- Controls оставить доступными и компактными.
- Code/question renderer должен быть тем же, что bank/editor/training.

### Competency Matrix (`/competency-matrix`)

Покрытие snapshot: нет.

Цель:

- Плотный matrix/report screen. Он не должен выглядеть как отдельная неродственная аналитика.
- Stack/competency cards и tables выровнять с team/growth analytics language.

Нужно сделать:

- Добавить snapshots user and manager variants.
- Matrix rows/cells должны иметь consistent status colors и compact spacing.
- Admin assignment filters/actions выровнять с toolbar/action footer rules.

### Account (`/account`)

Покрытие snapshot: desktop/mobile.

Текущее состояние:

- Desktop account слишком пустой.
- Mobile ощущается как дублирование account summary: shell account row плюс profile avatar/card.

Цель:

- Account должен быть простым, но не визуально пустым.
- Он должен использовать profile/card/stat primitives без локального visual language.

Нужно сделать:

- Уменьшить desktop whitespace за счет ограничения ширины или группировки profile/security blocks.
- На mobile не повторять avatar/name слишком тяжело между shell и content.
- Logout action остается secondary/destructive-neutral, не primary teal.

## Целевое покрытие snapshots

Сейчас покрыто:

- bank desktop/mobile
- editor-edit desktop/mobile
- review-filled desktop/mobile
- review-empty desktop/mobile
- account desktop/mobile
- training-active desktop/mobile
- training-exit desktop/mobile
- growth-user desktop/mobile
- bank-analysis desktop/mobile

Чего не хватает до утверждения редизайна:

- login
- question-details
- editor-create
- my-requests list/detail/empty
- topics list/dialog
- companies list/dialog
- users list/dialog
- training setup
- training-history list/detail
- training-presets list/dialog
- team dashboard
- employee interview history list/detail
- interviews admin calendar/dialog
- interviews dashboard
- my-interviews
- my-interviews-dashboard
- interview-history list/detail
- interview-runtime active/complete
- competency-matrix user/manager

Правила snapshot fixtures:

- Каждый snapshot должен использовать роль, требуемую route meta.
- Fixtures должны соответствовать форме generated SDK DTO.
- Structured content must be arrays of `{ kind, content, language? }`.
- Если у экрана есть empty и filled states, нужно снимать оба, когда empty state влияет на layout.
- Visual regression считается заблокированной, если snapshot снял redirect вместо целевого route.

## Порядок выравнивания редизайна

### Фаза 1: Документация и QA baseline

- Держать этот файл как target spec.
- Обновить `docs/superpowers/plans/2026-05-04-ui-system-redesign.md`: отметить выполненные пункты, убрать старый риск `Backend Core`, добавить ссылку на этот target.
- Разделить fixtures в `frontend/scripts/ui-snapshots/shared.mjs` на меньшие fixture builders перед добавлением новых сценариев.
- Добавить приоритетные snapshots: login, question-details, training setup, my-requests, topics/companies/users, training-history.

Критерии приемки:

- `npm run build` passes.
- `npm run ui:snap` passes 18/18 or expanded count.
- No snapshot represents unintended redirect.

### Фаза 2: Общие primitives

- Нормализовать surface tokens: primary surface, muted surface, border, hover, selected.
- Добавить/подтвердить shared classes for:
  - stat card
  - toolbar grid
  - table/list row
  - form section
  - empty/loading state
  - status chip
  - code block constraints
  - dialog footer
- Заменить повторяющийся local feature CSS этими primitives только там, где это реально снижает inconsistency.

Критерии приемки:

- No feature CSS creates new arbitrary whites/greys without token reason.
- No `calc(var(--panel-radius) - Npx)`.
- No negative letter spacing.

### Фаза 3: Data workflows

Экраны:

- bank
- question details
- editor
- my requests
- review
- topics
- companies
- users

Работы:

- Выровнять table/list/card density.
- Выровнять toolbar/action footer behavior.
- Исправить company/topic/status/difficulty chip language.
- Исправить mobile code block overflow.
- Review/editor diff/renderers должны использовать общий content rendering.

Критерии приемки:

- Desktop data screens are scan-friendly.
- Mobile screens have no horizontal body overflow.
- Code blocks scroll internally.

### Фаза 4: Training and growth

Экраны:

- training setup
- training active
- training exit
- training history
- growth card

Работы:

- Уменьшить huge empty surfaces.
- Исправить vertical balance карточки training active.
- Исправить exit dialog footer.
- Выровнять result cards и status chips.
- Fix `undefined частично` data formatting/mock issue.

Критерии приемки:

- Training active fits as intentional focused workspace on desktop/mobile.
- Growth mobile remains long but not wasteful.
- Empty panels no longer dominate.

### Фаза 5: Manager analytics и interview workflows

Экраны:

- bank-analysis
- team dashboard
- employee interview history
- interviews admin
- interviews dashboard
- my interviews
- my interviews dashboard
- interview history
- interview runtime
- competency matrix
- training presets

Работы:

- Выровнять analytics dashboard cards/progress/chips.
- Выровнять interview lists/calendar/runtime с той же DS.
- Добавить snapshots перед широкими visual changes.
- Сохранить domain-specific complexity, но переиспользовать surface/control primitives.

Критерии приемки:

- Manager dashboards выглядят как одна продуктовая семья.
- Runtime screens ощущаются сфокусированными, не как admin-table.
- CRUD/admin screens используют один list/dialog pattern.

## Definition of Done

Redesign alignment is complete only when:

- This target spec and implementation plan agree.
- Foundation tokens are the only source of common visual choices.
- `npm run build` passes.
- `npm run ui:snap` passes with expanded route coverage.
- Desktop and mobile screenshots show no unintended redirects, clipped button text, body horizontal overflow, incoherent overlaps, or giant empty panels.
- All roles have coherent navigation density: USER, MANAGER, ADMIN.
- New UI work can be implemented by following this document without inventing local visual rules.
