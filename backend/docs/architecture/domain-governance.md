# Domain governance

Источник: `prisma/schema.prisma`, `prisma/migrations/*`, `src/modules/*`, `openapi.json`, `ARCHITECTURE.md`, `docs/architecture/*.drawio`.

## 1. Источник домена

### Канон модели
- Каноническая схема БД: `backend/prisma/schema.prisma`.
- Каноническая история DDL: `backend/prisma/migrations/*/migration.sql`.
- Канонический API-контракт: `backend/openapi.json`.
- Каноническая модульная карта: `backend/ARCHITECTURE.md` и `backend/docs/architecture/backend-components.drawio`.
- Каноническая ER-визуализация: `backend/docs/architecture/domain-model.drawio`.
- Review-friendly проекции:
  - `backend/docs/architecture/domain-model.md`
  - `backend/docs/architecture/data-structures.md`

### Что именно брать из `schema.prisma`
- PK/FK связи.
- enum-ы и nullable/non-nullable поля.
- relation semantics: `Cascade`, `Restrict`, `SetNull`.
- unique и composite unique.
- Prisma-level индексы.

### Что брать из миграций
- partial unique index-ы и CHECK constraints, которых не видно в Prisma-модели так явно.
- историю эволюции модели.
- backward-compatibility миграции.
- фактический DDL для PostgreSQL.

### Реальный статус commit/PR history
- Внутри `backend/.git` есть git-репозиторий, но на `main` на 2026-03-11 нет ни одного коммита.
- Поэтому source of truth по мотивам изменений через commit/PR сейчас отсутствует.
- До появления истории git роль change log фактически выполняет последовательность Prisma migration-ов.

### Текущая хронология изменения модели по миграциям
- `20260305223000_init`
  - стартовый published question bank: `questions`, `topics`, `question_topics`.
- `20260307153000_authz_moderation`
  - `users`, `question_change_requests`, enum-ы ролей и moderation statuses;
  - partial unique по pending-заявке на вопрос;
  - отдельный индекс по `(targetQuestionId, status)`.
- `20260307170000_training_presets`
  - `training_presets`, `training_preset_topics`, ordered relation через `position`.
- `20260307210000_training_results_analytics`
  - `training_sessions`, `training_session_results`, `training_session_result_topics`;
  - начальная база под growth analytics.
- `20260308001500_user_auth_compat`
  - переход от legacy auth к локальному `login/passwordHash/status/tokenVersion`;
  - массовая backfill-нормализация логинов.
- `20260308002000_user_auth_finalize`
  - удаление `externalAuthId`, фиксация `users.login` unique.
- `20260308110000_question_content_blocks`
  - промежуточный legacy-format для `textBlocks/answerBlocks`.
- `20260308133000_question_structured_content`
  - переход на канонический `QuestionStructuredContent`;
  - миграция snapshots moderation и training history к structured content.
- `20260308211000_question_interview_encounters`
  - `question_interview_encounters` с composite PK.
- `20260310143000_training_feedback_target_user`
  - `trainerId`, `feedback` и индекс истории по `trainerId`.
- `20260310190000_companies_lead_question_bank_v1`
  - `companies`, `questions.companyId`, `pg_trgm`, trigram index по названию компании.
- `20260310223000_training_history_tristate`
  - tri-state mark `CORRECT | INCORRECT | PARTIAL`;
  - `partialCount`.
- `20260311003000_interviews_domain`
  - `interview_cycles`, `interviews`, `interview_questions`, `interview_question_topics`;
  - weekly planning, runtime snapshots, CHECK `interviewerId <> intervieweeId`.

## 2. Архитектурный контур

### Модули и ответственность
- `auth`
  - login endpoint, password verify, JWT issue.
- `authz`
  - глобальный `RolesGuard`, `Roles`, `StrictRoles`, `CurrentUser`.
- `users`
  - local accounts, admin CRUD, activation/deactivation, password reset.
- `topics`
  - справочник тем и их rename semantics.
- `companies`
  - справочник компаний и их rename semantics.
- `questions`
  - published question bank, direct admin CRUD, interview encounter flags.
- `question-change-requests`
  - moderation workflow, before/after snapshots, approve/reject orchestration.
- `search`
  - raw SQL search по published bank.
- `training`
  - presets, prepare, session save, history read-side.
- `interviews`
  - weekly cycle planning, runtime snapshots, completion, dashboards.
- `analytics`
  - growth analytics по training history и bank analytics по live bank.
- `infra/prisma`
  - `PrismaService`, lifecycle и DI boundary.

### Data-access boundary rules
- Controller дергает только свой service.
- Service владеет orchestration и валидацией.
- Repository владеет Prisma/raw SQL доступом.
- Repository не дергает service.
- Кросс-модульные вызовы делаются через exported service или exported access-module с repository.
- Единственный явный service-to-service call: `AuthService -> UsersService`.

### Кто кого может дергать

#### Service -> service
- `AuthService -> UsersService`

#### Service -> same-module repository
- `UsersService -> UsersRepository`
- `SearchService -> SearchRepository`
- `AnalyticsService -> AnalyticsRepository`
- `TrainingService -> TrainingPresetsRepository, TrainingRepository`
- `InterviewsService -> InterviewsRepository`
- `QuestionsService -> QuestionsRepository, QuestionInterviewEncountersRepository`
- `QuestionChangeRequestsService -> QuestionChangeRequestsRepository`
- `TopicsService -> TopicsRepository`
- `CompaniesService -> CompaniesRepository`

#### Service -> shared / foreign repository
- `QuestionsService -> CompaniesRepository, TopicsRepository, QuestionChangeRequestsRepository`
- `QuestionChangeRequestsService -> QuestionsRepository, CompaniesRepository, TopicsRepository`
- `SearchService -> QuestionChangeRequestsRepository, QuestionInterviewEncountersRepository`
- `TrainingService -> TopicsRepository, QuestionsRepository, QuestionSelectionRepository, UsersRepository`
- `InterviewsService -> QuestionSelectionRepository, TrainingPresetsRepository`
- `TopicsService -> QuestionChangeRequestsRepository`
- `CompaniesService -> QuestionChangeRequestsRepository`

#### Shared repository points
- `QuestionSelectionRepository`
  - shared read-side для `training` и `interviews`.
- `QuestionChangeRequestsRepository`
  - shared moderation state + snapshot sync для `questions`, `search`, `topics`, `companies`, `question-change-requests`.
- `TopicsRepository`
  - shared reference lookup для `questions`, `training`, `question-change-requests`.
- `CompaniesRepository`
  - shared reference lookup для `questions`, `question-change-requests`.
- `TrainingPresetsRepository`
  - shared между `training` и `interviews`.

### Access modules
- `QuestionsAccessModule`
  - экспортирует `QuestionsRepository`, `QuestionInterviewEncountersRepository`, `QuestionSelectionRepository`.
- `QuestionChangeRequestsAccessModule`
  - экспортирует `QuestionChangeRequestsRepository`.
- `TopicsAccessModule`
  - экспортирует `TopicsRepository`.
- `CompaniesAccessModule`
  - экспортирует `CompaniesRepository`.
- `TrainingAccessModule`
  - экспортирует `TrainingPresetsRepository`, `TrainingRepository`.

## 3. API-контракт

### Канон API
- Файл: `backend/openapi.json`.
- Источник генерации: Nest Swagger по controller + DTO.
- Если DTO/валидация меняются, `openapi.json` и frontend SDK обязаны обновляться в том же change set.

### Endpoint inventory
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `POST /api/users/:id/reset-password`
- `POST /api/users/:id/deactivate`
- `POST /api/users/:id/activate`
- `GET /api/topics`
- `POST /api/topics`
- `PATCH /api/topics/:id`
- `GET /api/companies`
- `POST /api/companies`
- `PATCH /api/companies/:id`
- `GET /api/questions`
- `GET /api/questions/:id`
- `POST /api/questions`
- `PATCH /api/questions/:id`
- `DELETE /api/questions/:id`
- `PUT /api/questions/:id/interview-encounter`
- `DELETE /api/questions/:id/interview-encounter`
- `GET /api/search/questions`
- `GET /api/training/presets`
- `GET /api/training/participants`
- `POST /api/training/presets`
- `PATCH /api/training/presets/:id`
- `DELETE /api/training/presets/:id`
- `POST /api/training/prepare`
- `GET /api/training/history`
- `GET /api/training/history/:id`
- `POST /api/training/results`
- `POST /api/interviews/cycles`
- `GET /api/interviews/cycles/:id`
- `POST /api/interviews/cycles/:id/pairs`
- `PATCH /api/interviews/:id`
- `DELETE /api/interviews/:id`
- `GET /api/interviews/admin-calendar`
- `GET /api/interviews/my-calendar`
- `GET /api/interviews/:id/runtime`
- `POST /api/interviews/:id/complete`
- `GET /api/interviews/admin-dashboard`
- `GET /api/interviews/my-dashboard`
- `GET /api/analytics/growth`
- `GET /api/analytics/bank`
- `POST /api/question-change-requests`
- `GET /api/question-change-requests/my`
- `GET /api/question-change-requests/review`
- `GET /api/question-change-requests/:id`
- `POST /api/question-change-requests/:id/approve`
- `POST /api/question-change-requests/:id/reject`

### Guards и роли
- `Roles(...)`
  - обычный role check;
  - `ADMIN` имеет override и проходит `USER`-endpoint-ы.
- `StrictRoles(...)`
  - отключает `ADMIN` override;
  - доступ только у явно указанной роли.
- Глобальный guard: `AuthzModule` регистрирует `RolesGuard` как `APP_GUARD`.
- JWT middleware висит на всех route, кроме `health` и `auth/login`.

### Где используется `StrictRoles`
- `GET /api/training/history`
- `GET /api/training/history/:id`
- `GET /api/interviews/my-calendar`
- `GET /api/interviews/:id/runtime`
- `POST /api/interviews/:id/complete`
- `GET /api/interviews/my-dashboard`
- `GET /api/analytics/growth`
- `GET /api/analytics/bank`

### Где достаточно `Roles`
- все CRUD и справочники;
- search;
- moderation queue;
- training prepare/results/presets;
- admin interviews endpoints.

### DTO и валидация
- DTO являются частью публичного контракта.
- Query/body значения вне declared `enum/min/max/format` считаются контрактным нарушением.
- Полный перечень DTO и shape см. в `backend/docs/architecture/data-structures.md`.

## 4. Поведение данных

### Live vs snapshot
- `Question` это только live published row.
- `QuestionChangeRequest.baseSnapshot/proposedSnapshot` это immutable snapshots на момент подачи заявки.
- `TrainingSessionResult` и `TrainingSessionResultTopic` это immutable snapshots training history.
- `InterviewQuestion` и `InterviewQuestionTopic` это immutable runtime snapshots интервью.
- Аналитика роста работает только по snapshots training history, а не по live bank.
- Interview-контур не пишет в `training_sessions`.

### Что обновляется, а что нет
- `Question`, `Topic`, `Company`, `TrainingPreset`, `Interview` могут обновляться через свои write-path.
- `TrainingSession*` после сохранения не редактируются.
- `InterviewQuestion*` регенерируются только как целый snapshot набора вопросов при `SCHEDULED` state transition или очистке snapshot-а.
- `QuestionChangeRequest` после review меняет только review-state поля; snapshots остаются слепком запроса.

### Snapshot synchronization rules

#### Rename Topic
- Точка входа: `TopicsService.update`.
- Выполняется в одной `prisma.$transaction`.
- После rename вызывается `QuestionChangeRequestsRepository.syncTopicInSnapshots`.
- Match rules:
  - по exact `topic.id`;
  - по legacy synthetic id `legacy:<oldSlug>`;
  - по legacy shape: `slug` или case-insensitive `name`.
- После замены snapshots сортируются по `slug`.

#### Rename Company
- Точка входа: `CompaniesService.update`.
- Выполняется в одной `prisma.$transaction`.
- После rename вызывается `QuestionChangeRequestsRepository.syncCompanyInSnapshots`.
- Match rules:
  - по `company.id`, если он есть;
  - fallback по case-insensitive `company.name`.

### Delete / soft-delete policy
- `Question`
  - hard delete;
  - прямой admin delete запрещен, если есть pending change request.
- `Interview`
  - hard delete;
  - completed interview удалять нельзя.
- `TrainingPreset`
  - hard delete.
- `QuestionChangeRequest`
  - soft-delete отсутствует; reviewed rows остаются как audit trail.
- `User`
  - hard delete отсутствует;
  - используется activate/deactivate через `status`.
- `Topic` и `Company`
  - delete endpoint-ов нет;
  - только list/create/update.

### Moderation approval invariants
- `CREATE`
  - создает live `Question` из `proposedSnapshot`.
- `UPDATE`
  - применяет `proposedSnapshot`, но только если текущий live-вопрос все еще равен `baseSnapshot`.
- `DELETE`
  - удаляет live `Question`, но только если live-состояние все еще равно `baseSnapshot`.
- `REJECT`
  - live bank не меняется.
- Любой approve/reject идет через `prisma.$transaction`.

### Seeding и bootstrap
- `npm run bootstrap:admin`
  - создает первого активного admin;
  - либо обновляет существующего при `BOOTSTRAP_ADMIN_FORCE_UPDATE=true`;
  - при update инкрементирует `tokenVersion`.
- `npm run seed:question-bank`
  - upsert-ит seed topics;
  - upsert-ит published questions;
  - upsert-ит default training presets.
- Seed topic behavior:
  - если уже есть topic с seed-id, обновляет;
  - если есть legacy row с тем же `slug`, переводит ее на seed-id;
  - то есть seed умеет конвертировать legacy topic identity.

### Legacy compatibility
- Legacy auth:
  - миграция с `externalAuthId/email` на `login/passwordHash/status/tokenVersion`.
- Legacy question content:
  - поддерживается coercion из массива блоков `{ kind, content, language }`.
- Legacy moderation snapshots:
  - при чтении понимаются old `textBlocks/answerBlocks`;
  - миграцией приведены к `textContent/answerContent`.
- Legacy topic snapshot identity:
  - synthetic id `legacy:<slug>`.
- Legacy company snapshot:
  - допускается отсутствие `id`, match по имени.

## 5. Индексы и аналитика

### Реальные индексы и constraints

#### Question bank
- `questions_difficulty_idx`
- `questions_companyId_idx`
- `topics_name_key`
- `topics_slug_key`
- `question_topics_topicId_idx`
- `companies_name_key`
- `companies_name_trgm_idx` via `pg_trgm`

#### Moderation
- `question_change_requests_status_createdAt_idx`
- `question_change_requests_authorId_status_createdAt_idx`
- `question_change_requests_targetQuestionId_status_idx`
- partial unique:
  - `question_change_requests_pending_targetQuestionId_key`
  - условие: `status = 'PENDING' AND targetQuestionId IS NOT NULL`

#### Users
- `users_login_key`
- `users_email_key`

#### Training
- `training_presets_name_key`
- `training_preset_topics_presetId_position_key`
- `training_preset_topics_topicId_idx`
- `training_sessions_userId_finishedAt_idx`
- `training_sessions_trainerId_finishedAt_idx`
- `training_session_results_sessionId_position_idx`
- `training_session_results_questionId_createdAt_idx`
- `training_session_result_topics_topicId_idx`

#### Interview encounter
- `question_interview_encounters_pkey (questionId, userId)`
- `question_interview_encounters_userId_idx`

#### Interviews
- `interview_cycles_periodStart_periodEnd_idx`
- `interview_cycles_createdByAdminId_idx`
- `interviews_cycleId_interviewerId_intervieweeId_key`
- `interviews_plannedDate_status_idx`
- `interviews_interviewerId_idx`
- `interviews_intervieweeId_idx`
- `interviews_cycleId_idx`
- `interview_questions_interviewId_position_idx`
- `interview_questions_questionId_idx`
- `interview_question_topics_topicId_idx`
- CHECK:
  - `interviews_interviewer_not_interviewee`

### Query-stability rules

#### Search
- default sort:
  - `rank DESC, createdAt DESC, id DESC`
- `newest`:
  - `createdAt DESC, id DESC`
- `popular`:
  - в текущей реализации алиас `newest`, то есть тоже `createdAt DESC, id DESC`
- Требование search SQL:
  - deterministic order с tie-breaker по `id DESC`
- FTS source:
  - `to_tsvector('simple', text || ' ' || answer)`
- Company filter:
  - `ILIKE` по `companies.name`

#### Training prepare
- Вопрос, связанный с несколькими выбранными темами, закрепляется за первой темой по порядку входного массива.
- Псевдослучайность:
  - `md5(question.id || ':' || seed)` внутри assigned topic.
- Ограничение:
  - до `DEFAULT_SELECTION_QUESTIONS_PER_TOPIC = 5` вопросов на assigned topic.
- Финальный порядок:
  - `difficulty ASC`
  - `topicPriority ASC`
  - `topicPickOrder ASC`
  - `id ASC`

#### Training history
- Список сессий:
  - `finishedAt DESC, createdAt DESC, id DESC`
- Детали результатов:
  - `position ASC, id ASC`

#### Analytics
- `bank difficulty mix`
  - source order `difficulty ASC`
- `bank topic counts`
  - `count DESC, name ASC, id DESC`
- `topTopics`
  - первые 5 после общего `count DESC`
- `sparseTopics`
  - `count <= 2`, затем первые 5 в том же базовом порядке
- `growth feedbackEntries`
  - `finishedAt DESC, createdAt DESC, id DESC`, limit 5
- `growth weakTopics`
  - SQL: `(incorrect + partial) DESC`, затем accuracy ASC, затем `topicId DESC`
  - service сохраняет тот же приоритет
- `growth failedQuestions`
  - `(incorrect + partial) DESC`, затем `lastAnsweredAt DESC`, затем `questionId DESC`
- `growth answeredQuestions`
  - `correctCount DESC`, затем `lastAnsweredAt DESC`, затем `questionId DESC`

#### Interviews
- `findLatestCycleOverlapping`
  - `periodStart DESC, createdAt DESC, id DESC`
- `listUpcoming`
  - `plannedDate ASC, id ASC`
- `listRecentCompleted`
  - `completedAt DESC, id DESC`
- `my dashboard feedbackEntries`
  - `completedAt DESC`, tie-breaker `id DESC`
- `my dashboard recentInterviews`
  - `completedAt DESC`, tie-breaker `id DESC`

## 6. Ожидаемый стиль диаграмм

### Разрешенные форматы
- Редактируемый source of truth:
  - `draw.io` (`.drawio`)
- Review-friendly projection:
  - `Mermaid` в markdown
- Не использовать:
  - inline SVG
  - raster-only схемы как единственный source
  - manual arrows вне draw.io graph model

### Layout rules
- Top-level layout:
  - предпочтительно `LR` для domain-model и component maps.
- Внутренние кластеры:
  - `TB` внутри bounded context / subgraph / контейнера.
- Edge routing:
  - только orthogonal.
- Grid:
  - шаг `10`.
- Typical page:
  - `1800x1200` или `1800x1400`.
- Outer margins:
  - `40..80px`.
- Card spacing:
  - `40..70px` по горизонтали;
  - `24..50px` по вертикали.

### Typography
- Base font family:
  - `Helvetica, Arial, sans-serif`
- Title:
  - `28px`, bold
- Section heading:
  - `18px`, bold
- Card heading:
  - `16px`, bold
- Card body:
  - `13px`
- Notes / legends:
  - `12..14px`

### Цветовая семантика
- `core`
  - amber: `#fef3c7` / stroke `#f59e0b`
- `ref`
  - light blue / cyan: `#dbeafe` or `#e0f2fe`, stroke `#93c5fd` or `#0ea5e9`
- `join`
  - neutral slate: `#f8fafc`, stroke `#94a3b8`
- `snapshot`
  - light red: `#fee2e2`, stroke `#f87171` or `#ef4444`
- `shared repository`
  - light green: `#dcfce7`, stroke `#86efac`
- `infra`
  - light violet: `#ede9fe`, stroke `#c4b5fd`
- `notes/legend`
  - neutral background `#f8fafc`, stroke `#cbd5e1`

### Edge semantics
- Solid line
  - физическая FK или обычный component dependency.
- Dashed line
  - logical reference / snapshot reference без FK.
- Block arrow
  - direction of dependency.
- Label background
  - белый, чтобы текст не терялся.

### Редактируемость
- Любая новая схема должна собираться из обычных draw.io primitives:
  - rounded rectangles
  - orthogonal connectors
  - text cells
  - table-like HTML labels допустимы
- Не рисовать вручную свободные стрелки мышью без стандартного connector behavior.
- Mermaid-файлы должны повторять ту же семантику, что и draw.io, но не заменять draw.io.

## 7. Целевые аудитории

### Review-friendly
- `domain-model.md`
- `data-structures.md`
- этот файл `domain-governance.md`

Назначение:
- diff-review;
- быстро проверить constraints, snapshots, guards, indices, sort semantics;
- удобно читать в Git / IDE без открытия diagrams.net.

### Onboarding
- `backend/ARCHITECTURE.md`
- `backend-components.drawio`
- `domain-model.drawio`

Назначение:
- быстро понять bounded contexts;
- увидеть service/repository split;
- понять, где live data, где snapshots, где raw SQL.

## 8. Практическое правило обновления

При изменении любого из следующих слоев:
- `schema.prisma`
- `prisma/migrations/*`
- `src/modules/*`
- `openapi.json`
- snapshot semantics
- guards / roles
- query ordering / analytics rules

обновляются в том же change set:
- `backend/ARCHITECTURE.md`
- `backend/docs/architecture/domain-model.drawio`
- `backend/docs/architecture/domain-model.md`
- `backend/docs/architecture/data-structures.md`
- `backend/docs/architecture/domain-governance.md`
