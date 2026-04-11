# Nord Clan UI Spec

Основание: `/Users/slave/Downloads/design-brief.md`, `/Users/slave/Downloads/tokens.json`, `/Users/slave/Downloads/component-rules.md`, `/Users/slave/Downloads/ai-prompts.md`.

## Что сейчас расходится с контрактом

- [`frontend/src/style.css`](/Users/slave/Nord/frontend/src/style.css#L3) использует стороннюю палитру, лишние градиенты, лишние тени, радиусы `18px/20px/26px/28px` и `panel-padding-compact: 18px`, что нарушает brief и tokens.
- [`frontend/src/plugins/vuetify.ts`](/Users/slave/Nord/frontend/src/plugins/vuetify.ts#L11) задаёт тему на произвольных значениях вместо токенов.
- [`frontend/src/components/questions/QuestionsTable.vue`](/Users/slave/Nord/frontend/src/components/questions/QuestionsTable.vue#L46) строит `v-table`, хотя правило требует список карточек одинаковой высоты.
- [`frontend/src/views/TopicsAdminView.vue`](/Users/slave/Nord/frontend/src/views/TopicsAdminView.vue#L203) и [`frontend/src/views/TrainingPresetsView.vue`](/Users/slave/Nord/frontend/src/views/TrainingPresetsView.vue#L243) напрямую используют `v-text-field`, `v-select`, `v-autocomplete`, `v-btn`, `v-table`.
- [`frontend/src/components/questions/QuestionChangeRequestDiffCard.vue`](/Users/slave/Nord/frontend/src/components/questions/QuestionChangeRequestDiffCard.vue#L179) использует прямые `v-textarea` и `v-btn`, из-за чего review-flow визуально выбивается из UI-слоя.
- Snapshot-контур неполный: `growth-user.png` и `bank-analysis.png` совпадают по hash в desktop и mobile baseline, поэтому экран `growth-card` сейчас фактически не покрыт визуальной регрессией.

## 1. Визуальные направления

### Вариант A. Ledger Editorial

Идея: дорогая бумага, книжная редактура, бухгалтерская точность. Визуальный центр тяжести у текста и структурированных блоков, а не у декоративности.

- Палитра:
  - `paper` как основной фон shell и top bar.
  - `ivory` для вложенных плоскостей, table-head, field-fill.
  - `ink` для всех заголовков, основного текста и тонких разделителей.
  - `ink-muted` для eyebrow, мета-текста, placeholder, вторичных подписей.
  - `cyan` для primary-action, links, focus, active-nav.
  - `cyan-light` только как вторая точка CTA-градиента и мягкий selection/focus tint.
  - `brass` только для warning-подсветок и вторичных аналитических акцентов.
- Типографика:
  - display: `Fraunces`, `32px`, line-height `1.4`.
  - h1: `Fraunces`, `28px`.
  - h2: `Fraunces`, `24px`.
  - body: `IBM Plex Sans`, `16px`.
  - small: `IBM Plex Sans`, `14px`.
- Сетка:
  - базовый ритм `8px`;
  - shell padding `24px`;
  - frame gap `20px`;
  - panel padding `28px`;
  - compact spacing `16px`;
  - внутренние отступы строк и контролов кратны `4px`.
- Кнопки и поля:
  - primary: `linear-gradient(90deg, cyan 0%, cyan-light 100%)`, текст `paper`, radius `8px`.
  - secondary: `paper`, border `ink-muted`, текст `ink`.
  - field/select: `ivory`, border `ink-muted`, focus border `cyan`, без inset-эффектов и без внутренних свечений.
- Теги сложности:
  - плоские pill-бейджи `12px`;
  - uppercase `small-size`;
  - `junior` спокойный зелёный, `middle` тёплый brass-based, `senior` muted danger.
- Риски:
  - при слабой иерархии экран быстро станет “однотонным”;
  - нельзя перегружать карточки второстепенными chip-элементами.

### Вариант B. Annotated Archive

Идея: архив карточек и редакторских аннотаций. Больше роли у моно-лейблов, больше ощущение каталога, меньше эмоциональности.

- Палитра:
  - `paper` и `ivory` делят экран почти поровну;
  - `ink` держит весь контраст;
  - `cyan` применяется строго на действия и active-state;
  - `brass` идёт в предупреждения, moderation-ожидание, дефицит покрытия.
- Типографика:
  - та же шкала, но больше частота `small-size` для подписи строк и метаданных.
- Сетка:
  - тот же `8px` grid;
  - заголовки блоков и поля выравниваются по строгой вертикали;
  - больше значения имеет `panel-padding-compact`.
- Кнопки и поля:
  - secondary используются чаще primary;
  - primary CTA только в одном месте на экране;
  - поля более “архивные”: меньше воздуха сверху, жестче подпись label.
- Теги сложности:
  - как регистрационные ярлыки: чуть заметнее border, меньше фон.
- Риски:
  - user-экраны могут стать слишком административными;
  - training потеряет премиальную драматургию.

### Вариант C. Studio Ledger

Идея: более современная, светлая трактовка Nord Clan без потери premium-тональности. Больше пустоты и контрастных CTA, меньше “архивности”.

- Палитра:
  - `paper` доминирует;
  - `ivory` почти только для field-fill и header-strip;
  - `cyan` заметнее, `brass` почти исчезает из повседневного UI.
- Типографика:
  - та же шкала, но сильнее контраст между display и body за счёт воздуха.
- Сетка:
  - больше reliance на `frame-gap`;
  - summary/stat-блоки визуально легче.
- Кнопки и поля:
  - CTA активнее, secondary чище;
  - поля спокойные, но экран сильнее зависит от пустого пространства.
- Теги сложности:
  - чуть более яркие, чем в остальных вариантах.
- Риски:
  - moderation, topics и training-presets теряют ощущение “рабочего инструмента”;
  - mobile быстрее начинает расползаться из-за нехватки плотности.

### Лучший вариант

Лучший вариант: **Ledger Editorial**.

Причина: он точнее всего совпадает с brief. У него правильный баланс между premium-editorial, корпоративной ясностью и списочно-табличными сценариями. Он одинаково хорошо работает на `bank`, `review`, `topics`, `training` и `account`, не требует декоративных компромиссов и не ломает информационную плотность.

## 2. Итоговые токены

Изменения относительно исходного `tokens.json`:

- `panel-padding-compact`: `18px -> 16px`, чтобы вернуть кратность `4px`.
- `cyan-light`: затемнён, чтобы CTA-градиент с текстом `paper` не терял контраст.
- `danger`, `success`, `warning`: затемнены под белый текст в status-badge.
- Добавлен блок `layout`, потому что `sidebar-width`, `topbar-height`, `icon-button-size`, `dialog-max-width` уже зафиксированы в component-rules и должны жить как токены, а не вразнобой в стилях.

```json
{
  "spacing": {
    "shell-padding": "24px",
    "frame-gap": "20px",
    "panel-padding": "28px",
    "panel-padding-compact": "16px"
  },
  "radius": {
    "panel": "24px",
    "control": "8px",
    "pill": "12px"
  },
  "layout": {
    "sidebar-width": "292px",
    "topbar-height": "64px",
    "control-height": "48px",
    "icon-button-size": "32px",
    "list-row-min-height": "64px",
    "dialog-max-width": "480px",
    "min-touch-target": "40px"
  },
  "colors": {
    "paper": "#F8F4ED",
    "ivory": "#ECE2D0",
    "ink": "#0F3C43",
    "ink-muted": "#385E61",
    "cyan": "#187A82",
    "cyan-light": "#2B878E",
    "brass": "#C39A5E",
    "danger": "#A63C3C",
    "success": "#356F55",
    "warning": "#8C6532",
    "tag-junior": "#4A9A70",
    "tag-middle": "#C2A257",
    "tag-senior": "#C44545",
    "backdrop": "linear-gradient(180deg,#0F3C43 0%,#163C42 100%)"
  },
  "typography": {
    "display-font": "'Fraunces', serif",
    "ui-font": "'IBM Plex Sans', sans-serif",
    "mono": "'JetBrains Mono', monospace",
    "display-size": "32px",
    "h1-size": "28px",
    "h2-size": "24px",
    "body-size": "16px",
    "small-size": "14px",
    "line-height": "1.4"
  },
  "shadows": {
    "overlay": "0 6px 12px rgba(15,60,67,0.08)",
    "floating-card": "0 12px 24px rgba(15,60,67,0.12)"
  }
}
```

## 3. Аудит экранов

### bank

Проблемы:

- [`QuestionsTable.vue`](/Users/slave/Nord/frontend/src/components/questions/QuestionsTable.vue#L46) использует `v-table`, а строки имеют разную высоту из-за длинного ответа и пары action-кнопок.
- Статус `На модерации` живёт внутри текстового столбца, а не как отдельный правый маркер.
- Toolbar в банке визуально плотнее, чем summary-strip, из-за чего экран ощущается как собранный из двух систем.

Изменения:

- Перевести список в card-row pattern: `question`, `difficulty`, `topics`, `updatedAt`, `actions`, `status`.
- Ограничить answer-preview двумя строками.
- Перенести `На модерации` в крайний правый слот строки.
- Для toolbar оставить одну панель с сеткой `5/2/3/2`, а action-row вынести в правый край той же панели.

Обновлённый layout:

- `summary-grid` 3 колонки.
- `toolbar-panel` одна строка controls + одна строка actions.
- `list-panel` с `list-row-min-height: 64px`, hover только через `ivory`, без zebra.

### editor

Проблемы:

- [`style.css`](/Users/slave/Nord/frontend/src/style.css#L964) задаёт toggle сложности через радиусы `20px/16px` и тень активного сегмента, что не соответствует control-radius.
- Второй ряд формы визуально слабее первого, хотя именно он определяет сложность и темы.
- В create/edit режиме экран слишком пустой ниже fold.

Изменения:

- Segmented control привести к `control-radius: 8px`, фон `ivory`, active-state без drop-shadow.
- Скомпоновать difficulty и topics в равновесную пару, где темы визуально чуть шире.
- Кнопки действий держать на baseline формы, не растягивать их по ширине без необходимости.

Обновлённый layout:

- один `UiPanel` шириной `max 960px`;
- header: title слева, mode-chip справа;
- form: `text`, `answer`, затем `difficulty + topics`, затем actions.

### requests

Проблемы:

- [`MyRequestsView.vue`](/Users/slave/Nord/frontend/src/views/MyRequestsView.vue#L106) повторяет admin-review layout почти без адаптации под user-сценарий.
- Левый список слишком пустой при малом числе заявок.
- В diff-card вторичная мета-информация конкурирует с самими изменениями.

Изменения:

- Для user-экрана сузить левую колонку до фиксированного списка `360px`.
- В карточке заявки показывать subject, status, type/date; автора скрыть, потому что он не несёт ценности самому пользователю.
- В diff-detail блок “ревьюер/комментарий” опускать ниже after-state.

Обновлённый layout:

- `list rail + detail panel`;
- detail panel: header, before/after, topic diff, review outcome.

### review

Проблемы:

- [`QuestionChangeRequestDiffCard.vue`](/Users/slave/Nord/frontend/src/components/questions/QuestionChangeRequestDiffCard.vue#L179) использует прямой `v-textarea` и прямые `v-btn`.
- Decision-area визуально равна аналитической части и не даёт понятного финального фокуса.
- “До/После” и summary-блоки образуют визуальный шум из одинаковых карточек.

Изменения:

- Заменить textarea на `UiField textarea`, кнопки на `UiButton`.
- Сгруппировать detail в три зоны: `meta`, `diff`, `decision`.
- `Approve` сделать secondary, `Reject` оставить danger, но активировать только при заполненном reason.

Обновлённый layout:

- left rail с очередью;
- right panel: header, meta-row, before/after, short diff-summary, decision-bar.

### topics

Проблемы:

- [`TopicsAdminView.vue`](/Users/slave/Nord/frontend/src/views/TopicsAdminView.vue#L203) полностью обходит UI-layer.
- `v-table` делает экран слишком “бек-офисным”.
- Поле поиска, page-size и CTA живут на одном визуальном уровне, но не выстроены по приоритету.

Изменения:

- Перевести controls на `UiField`, `UiSelect`, `UiButton`.
- Таблицу заменить на список строк-карточек фиксированной высоты.
- В строке темы оставить `name`, `slug`, `questionsCount`, `rename`.
- `ID` убрать из основного списка; показывать только в диалоге или tooltip.

Обновлённый layout:

- summary-strip;
- controls-panel;
- topics-list panel;
- dialog `max-width: 480px`.

### training

Проблемы:

- [`style.css`](/Users/slave/Nord/frontend/src/style.css#L1363) добавляет радиальные декоративные эффекты, лишний чёрный градиентный хвост и card-shadow сильнее допустимого.
- [`style.css`](/Users/slave/Nord/frontend/src/style.css#L1468) даёт focus-card радиус `28px` и oversized shadow.
- Боковые кнопки “Назад/Вперёд” занимают слишком много места.

Изменения:

- Использовать только токен `backdrop` без дополнительных radial overlays.
- Card-plane привести к `radius.panel`, `shadow.floating-card`, без extra glow.
- Навигацию перевести в icon-buttons `32px`, вынести по бокам карточки.
- Setup-экран сократить до одного подготовительного panel + краткого summary.

Обновлённый layout:

- setup: `summary-grid + setup-panel`;
- arena: topbar, progress-strip, central card-plane, bottom action row, exit dialog.

### training-presets

Проблемы:

- [`TrainingPresetsView.vue`](/Users/slave/Nord/frontend/src/views/TrainingPresetsView.vue#L243) так же обходит UI-layer.
- Список пресетов визуально выглядит как CRUD-таблица, а не как curated presets catalog.
- Диалог редактирования перегружен мелкими action-кнопками одинакового веса.

Изменения:

- Заменить список на card-rows.
- В диалоге использовать `UiField` для названия, `UiAutocomplete` для pick, `UiButton` и `icon-button 32px` для reorder/remove.
- Убрать длинный explanatory copy из основной панели, оставить короткую hint-строку под заголовком.

Обновлённый layout:

- summary-strip;
- catalog panel;
- dialog `560px`, внутри `name`, `add topic`, `ordered list`, `actions`.

### growth-card

Проблемы:

- [`GrowthCardView.vue`](/Users/slave/Nord/frontend/src/views/GrowthCardView.vue#L21) использует summary из 4 карточек, а ниже сразу 3 равновесных колонки, из-за чего слабые темы теряют приоритет.
- `false` и `true` панели слишком симметричны.
- Snapshot baseline сейчас недостоверен: `growth-user.png` совпадает с `bank-analysis.png`.

Изменения:

- Оставить 4 summary-cards сверху.
- Ниже перейти на `1 + 2` композицию: слабые темы слева, справа стек из `false` и `true`.
- `false` блок оставить главным, `true` сделать более спокойным по тону.
- Обновить snapshot fixture до реального growth-card сценария.

Обновлённый layout:

- `summary-grid`;
- `growth-user-layout: 0.75fr / 1.25fr`;
- правая колонка содержит два stack-panel последовательно.

### bank-analysis

Проблемы:

- [`BankAnalysisView.vue`](/Users/slave/Nord/frontend/src/views/BankAnalysisView.vue#L57) делает каждое заключение отдельной card-CTA, из-за чего аналитика читается как набор рекламных карточек.
- Нижний ряд с метриками визуально равен верхнему, хотя это supporting layer.

Изменения:

- Свести focus items в единую аналитическую панель с общим заголовком.
- Оставить CTA только как завершающее действие внутри карточки, а не как главный визуальный объект.
- Topic pills и bars выровнять по одному внутреннему отступу.

Обновлённый layout:

- summary-strip;
- single insights panel на 3 колонки;
- lower metrics row на 3 спокойных панели.

### account

Проблемы:

- [`AccountView.vue`](/Users/slave/Nord/frontend/src/views/AccountView.vue#L38) визуально распадается на сильную левую карточку и пустую правую.
- Аватар окрашен семантическим `primary` Vuetify, а не собственной token-bound переменной.
- Блок фактов слишком дробный.

Изменения:

- Свести роль и диагностику ближе к блоку профиля.
- Аватар красить через `cyan`.
- `account-facts` сделать строкой одинаковых мета-карт или компактным key/value list.

Обновлённый layout:

- desktop: `2fr / 1fr`;
- tablet/mobile: один столбец;
- правый panel содержит роль, краткий dev-mode caption и status/error.

## 4. CSS custom properties

```css
:root {
  --color-paper: #F8F4ED;
  --color-ivory: #ECE2D0;
  --color-ink: #0F3C43;
  --color-ink-muted: #385E61;
  --color-cyan: #187A82;
  --color-cyan-light: #2B878E;
  --color-brass: #C39A5E;
  --color-danger: #A63C3C;
  --color-success: #356F55;
  --color-warning: #8C6532;
  --color-tag-junior: #4A9A70;
  --color-tag-middle: #C2A257;
  --color-tag-senior: #C44545;

  --shell-padding: 24px;
  --frame-gap: 20px;
  --panel-padding: 28px;
  --panel-padding-compact: 16px;

  --panel-radius: 24px;
  --control-radius: 8px;
  --pill-radius: 12px;

  --sidebar-width: 292px;
  --topbar-height: 64px;
  --control-height: 48px;
  --icon-button-size: 32px;
  --list-row-min-height: 64px;
  --dialog-max-width: 480px;
  --min-touch-target: 40px;

  --font-display: 'Fraunces', serif;
  --font-ui: 'IBM Plex Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-display: 32px;
  --font-size-h1: 28px;
  --font-size-h2: 24px;
  --font-size-body: 16px;
  --font-size-small: 14px;
  --line-height-base: 1.4;

  --shadow-overlay: 0 6px 12px rgba(15, 60, 67, 0.08);
  --shadow-floating-card: 0 12px 24px rgba(15, 60, 67, 0.12);
  --training-backdrop: linear-gradient(180deg, #0F3C43 0%, #163C42 100%);

  --btn-primary-bg: linear-gradient(90deg, var(--color-cyan) 0%, var(--color-cyan-light) 100%);
  --btn-primary-bg-hover: linear-gradient(90deg, var(--color-ink) 0%, var(--color-cyan) 100%);
  --btn-primary-border: var(--color-cyan);
  --btn-primary-color: var(--color-paper);

  --btn-secondary-bg: var(--color-paper);
  --btn-secondary-bg-hover: var(--color-ivory);
  --btn-secondary-border: var(--color-ink-muted);
  --btn-secondary-border-hover: var(--color-cyan);
  --btn-secondary-color: var(--color-ink);

  --btn-text-bg: transparent;
  --btn-text-bg-hover: var(--color-ivory);
  --btn-text-border: transparent;
  --btn-text-color: var(--color-ink-muted);

  --field-bg: var(--color-ivory);
  --field-border: var(--color-ink-muted);
  --field-border-focus: var(--color-cyan);
  --field-placeholder: var(--color-ink-muted);
  --panel-border: color-mix(in srgb, var(--color-ink-muted) 22%, var(--color-paper));
  --table-header-bg: var(--color-ivory);
}
```

## 5. Vuetify light theme

```ts
import type { ThemeDefinition } from 'vuetify';

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F8F4ED',
    surface: '#F8F4ED',
    primary: '#187A82',
    secondary: '#0F3C43',
    accent: '#2B878E',
    info: '#ECE2D0',
    success: '#356F55',
    warning: '#8C6532',
    error: '#A63C3C',
    paper: '#F8F4ED',
    ivory: '#ECE2D0',
    ink: '#0F3C43',
    'ink-muted': '#385E61',
    cyan: '#187A82',
    'cyan-light': '#2B878E',
    brass: '#C39A5E',
    danger: '#A63C3C',
    'on-background': '#0F3C43',
    'on-surface': '#0F3C43',
    'on-primary': '#F8F4ED',
    'on-secondary': '#F8F4ED',
    'surface-variant': '#ECE2D0'
  }
};
```

## 6. Semantic button/state map

```ts
export const buttonStateMap = {
  primary: {
    default: {
      background: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-color)',
      border: 'var(--btn-primary-border)'
    },
    hover: {
      background: 'var(--btn-primary-bg-hover)',
      color: 'var(--btn-primary-color)',
      border: 'var(--btn-primary-border)'
    },
    disabled: {
      background: 'color-mix(in srgb, var(--color-ink-muted) 40%, var(--color-paper))',
      color: 'var(--color-paper)',
      border: 'transparent'
    }
  },
  secondary: {
    default: {
      background: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-color)',
      border: 'var(--btn-secondary-border)'
    },
    hover: {
      background: 'var(--btn-secondary-bg-hover)',
      color: 'var(--btn-secondary-color)',
      border: 'var(--btn-secondary-border-hover)'
    },
    disabled: {
      background: 'var(--color-paper)',
      color: 'color-mix(in srgb, var(--color-ink-muted) 70%, var(--color-paper))',
      border: 'color-mix(in srgb, var(--color-ink-muted) 28%, var(--color-paper))'
    }
  },
  text: {
    default: {
      background: 'var(--btn-text-bg)',
      color: 'var(--btn-text-color)',
      border: 'var(--btn-text-border)'
    },
    hover: {
      background: 'var(--btn-text-bg-hover)',
      color: 'var(--color-ink)',
      border: 'var(--btn-text-border)'
    },
    disabled: {
      background: 'transparent',
      color: 'color-mix(in srgb, var(--color-ink-muted) 68%, var(--color-paper))',
      border: 'transparent'
    }
  },
  icon: {
    default: {
      background: 'transparent',
      color: 'var(--color-ink-muted)',
      border: 'transparent'
    },
    hover: {
      background: 'var(--color-ivory)',
      color: 'var(--color-ink)',
      border: 'transparent'
    },
    disabled: {
      background: 'transparent',
      color: 'color-mix(in srgb, var(--color-ink-muted) 68%, var(--color-paper))',
      border: 'transparent'
    }
  }
} as const;
```

## 7. TypeScript ThemeTokens

```ts
export interface ThemeTokens {
  spacing: {
    shellPadding: string;
    frameGap: string;
    panelPadding: string;
    panelPaddingCompact: string;
  };
  radius: {
    panel: string;
    control: string;
    pill: string;
  };
  layout: {
    sidebarWidth: string;
    topbarHeight: string;
    controlHeight: string;
    iconButtonSize: string;
    listRowMinHeight: string;
    dialogMaxWidth: string;
    minTouchTarget: string;
  };
  colors: {
    paper: string;
    ivory: string;
    ink: string;
    inkMuted: string;
    cyan: string;
    cyanLight: string;
    brass: string;
    danger: string;
    success: string;
    warning: string;
    tagJunior: string;
    tagMiddle: string;
    tagSenior: string;
    backdrop: string;
  };
  typography: {
    displayFont: string;
    uiFont: string;
    mono: string;
    displaySize: string;
    h1Size: string;
    h2Size: string;
    bodySize: string;
    smallSize: string;
    lineHeight: string;
  };
  shadows: {
    overlay: string;
    floatingCard: string;
  };
}

export const themeTokens: ThemeTokens = {
  spacing: {
    shellPadding: '24px',
    frameGap: '20px',
    panelPadding: '28px',
    panelPaddingCompact: '16px'
  },
  radius: {
    panel: '24px',
    control: '8px',
    pill: '12px'
  },
  layout: {
    sidebarWidth: '292px',
    topbarHeight: '64px',
    controlHeight: '48px',
    iconButtonSize: '32px',
    listRowMinHeight: '64px',
    dialogMaxWidth: '480px',
    minTouchTarget: '40px'
  },
  colors: {
    paper: '#F8F4ED',
    ivory: '#ECE2D0',
    ink: '#0F3C43',
    inkMuted: '#385E61',
    cyan: '#187A82',
    cyanLight: '#2B878E',
    brass: '#C39A5E',
    danger: '#A63C3C',
    success: '#356F55',
    warning: '#8C6532',
    tagJunior: '#4A9A70',
    tagMiddle: '#C2A257',
    tagSenior: '#C44545',
    backdrop: 'linear-gradient(180deg,#0F3C43 0%,#163C42 100%)'
  },
  typography: {
    displayFont: "'Fraunces', serif",
    uiFont: "'IBM Plex Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
    displaySize: '32px',
    h1Size: '28px',
    h2Size: '24px',
    bodySize: '16px',
    smallSize: '14px',
    lineHeight: '1.4'
  },
  shadows: {
    overlay: '0 6px 12px rgba(15,60,67,0.08)',
    floatingCard: '0 12px 24px rgba(15,60,67,0.12)'
  }
};
```

## 8. Пример UiButton

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { buttonStateMap } from '@/theme/button-state-map';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'text' | 'icon';
}>(), {
  disabled: false,
  tone: 'primary'
});

const vars = computed(() => {
  const tone = props.tone;
  const state = props.disabled ? 'disabled' : 'default';
  const hover = buttonStateMap[tone].hover;
  const current = buttonStateMap[tone][state];

  return {
    '--ui-btn-bg': current.background,
    '--ui-btn-color': current.color,
    '--ui-btn-border': current.border,
    '--ui-btn-bg-hover': hover.background,
    '--ui-btn-color-hover': hover.color,
    '--ui-btn-border-hover': hover.border
  };
});
</script>

<template>
  <button
    class="ui-button"
    :data-tone="tone"
    :disabled="disabled"
    :style="vars"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-height);
  min-width: var(--min-touch-target);
  padding: 0 var(--panel-padding-compact);
  border: 1px solid var(--ui-btn-border);
  border-radius: var(--control-radius);
  background: var(--ui-btn-bg);
  color: var(--ui-btn-color);
  font-family: var(--font-ui);
  font-size: var(--font-size-small);
  font-weight: 600;
  line-height: var(--line-height-base);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.ui-button:hover:not(:disabled),
.ui-button:focus-visible:not(:disabled) {
  background: var(--ui-btn-bg-hover);
  color: var(--ui-btn-color-hover);
  border-color: var(--ui-btn-border-hover);
  box-shadow: var(--shadow-overlay);
}

.ui-button:disabled {
  cursor: not-allowed;
  box-shadow: none;
}

.ui-button[data-tone='icon'] {
  width: var(--icon-button-size);
  min-width: var(--icon-button-size);
  padding: 0;
}
</style>
```

## 9. Порядок внедрения

1. Заменить palette и spacing в [`frontend/src/style.css`](/Users/slave/Nord/frontend/src/style.css).
2. Привести [`frontend/src/plugins/vuetify.ts`](/Users/slave/Nord/frontend/src/plugins/vuetify.ts) к `lightTheme`.
3. Убрать прямое использование high-visibility компонентов из `topics`, `training-presets`, `review`.
4. Перевести `bank`, `topics`, `training-presets` с `v-table` на row-card list pattern.
5. Пересобрать `training arena` строго на `backdrop + one card-plane`.
6. Исправить snapshot fixtures и переснять baseline, включая реальный `growth-card`.
