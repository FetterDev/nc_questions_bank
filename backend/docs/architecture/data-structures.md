# Data structures reference

Источник: `backend/prisma/schema.prisma`, `backend/src/modules/*`, `backend/src/infra/*`.

## 1. Базовые value domains

### UserRole
- `USER`
- `ADMIN`

### UserStatus
- `ACTIVE`
- `DISABLED`

### QuestionChangeRequestType
- `CREATE`
- `UPDATE`
- `DELETE`

### QuestionChangeRequestStatus
- `PENDING`
- `APPROVED`
- `REJECTED`

### TrainingSessionStatus
- `COMPLETED`
- `ABANDONED_SAVED`

### TrainingSessionResultMark
- DB-значения: `CORRECT`, `INCORRECT`, `PARTIAL`
- API-значения: `correct`, `incorrect`, `partial`

### InterviewStatus
- `DRAFT`
- `PLANNED`
- `SCHEDULED`
- `COMPLETED`

### InterviewCycleMode
- `AUTO`
- `MANUAL`

### QuestionDifficulty
- API-значения: `junior`, `middle`, `senior`, `lead`
- DB rank:
  - `junior` -> `1`
  - `middle` -> `2`
  - `senior` -> `3`
  - `lead` -> `4`

### QuestionCodeLanguage
- `javascript`
- `jsx`
- `typescript`
- `tsx`

### Auth constraints
- `login`: regex `^[a-z0-9._-]{3,64}$`
- `password`: длина `12..128`

## 2. Embedded JSON и snapshot structures

### QuestionStructuredContent
Назначение: каноническое содержимое вопроса или ответа.

Поля:
- `text: string` — обязательный основной текст.
- `code?: string` — опциональный код.
- `codeLanguage?: QuestionCodeLanguage` — допустим только вместе с непустым `code`.

Инварианты:
- значение должно быть объектом;
- `text` обязателен и после trim не может быть пустым;
- `code`, если передан, должен быть строкой;
- `codeLanguage` без `code` запрещен;
- перевод строк нормализуется к `\n`;
- plain-text длина после `join(text + "\n\n" + code)` ограничена:
  - `Question text`: до `1000`;
  - `Question answer`: до `5000`;
- поддерживается backward-compatible coercion из legacy массива блоков `{ kind, content, language }`.

### QuestionSnapshotTopic
Используется в moderation snapshots.

Поля:
- `id: string`
- `name: string`
- `slug: string`

Особенности:
- при чтении legacy snapshot `id` может отсутствовать;
- тогда вычисляется synthetic id вида `legacy:<slug>`.

### QuestionSnapshotCompany
Поля:
- `id: string`
- `name: string`

### QuestionSnapshot
Назначение: полная снимковая версия вопроса для moderation.

Поля:
- `text: string`
- `answer: string`
- `textContent: QuestionStructuredContent`
- `answerContent: QuestionStructuredContent`
- `difficulty: QuestionDifficulty`
- `company: QuestionSnapshotCompany | null`
- `topics: QuestionSnapshotTopic[]`

Особенности:
- сериализуется в JSON для `baseSnapshot` и `proposedSnapshot`;
- equality проверяется по canonicalized представлению;
- порядок тем канонизируется сортировкой по `slug`.

### QuestionDraftPayload
Внутренний write-side payload published question.

Поля:
- `textContent: QuestionStructuredContent`
- `answerContent: QuestionStructuredContent`
- `difficulty: QuestionDifficulty`
- `topicIds: string[]`
- `companyId?: string | null`

### NormalizedQuestionPayload
Результат domain normalization перед записью вопроса.

Поля:
- `text: string`
- `answer: string`
- `textContent: QuestionStructuredContent`
- `answerContent: QuestionStructuredContent`
- `difficultyRank: 1 | 2 | 3 | 4`
- `companyId: string | null`
- `topicIds: string[]`
- `snapshot: QuestionSnapshot`

### PendingQuestionState
Состояние moderation для live-вопроса.

Поля:
- `hasPendingChangeRequest: boolean`
- `hasMyPendingChangeRequest: boolean`

### QuestionInterviewEncounterState
Агрегированное состояние отметки "встречал на собесе".

Поля:
- `count: number`
- `checkedByCurrentUser: boolean`

## 3. Persisted domain model

### Question (`questions`)
Назначение: опубликованный вопросовый банк.

Поля:
- `id: string` — PK, `cuid()`
- `text: string` — derived plain text
- `textContent: Json` — `QuestionStructuredContent`
- `answer: string` — derived plain text
- `answerContent: Json` — `QuestionStructuredContent`
- `difficulty: smallint` — `1..4`
- `companyId: string | null`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Связи:
- `companyId -> Company.id`, `onDelete: SetNull`
- M:N с `Topic` через `QuestionTopic`
- 1:N с `QuestionInterviewEncounter`

Индексы:
- `difficulty`
- `companyId`

### Company (`companies`)
Назначение: справочник компаний.

Поля:
- `id: string` — PK, `cuid()`
- `name: string` — unique
- `createdAt: DateTime`
- `updatedAt: DateTime`

Связи:
- 1:N с `Question`

### User (`users`)
Назначение: локальная auth/account сущность.

Поля:
- `id: string` — PK, `cuid()`
- `login: string` — unique, immutable login-id
- `email: string | null` — nullable unique
- `displayName: string`
- `role: UserRole`
- `status: UserStatus`
- `passwordHash: string`
- `tokenVersion: number` — default `0`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Связи:
- 1:N `QuestionChangeRequest.author`
- 1:N `QuestionChangeRequest.reviewer`
- 1:N `TrainingSession.user`
- 1:N `TrainingSession.trainer`
- 1:N `InterviewCycle.createdByAdmin`
- 1:N `Interview.interviewer`
- 1:N `Interview.interviewee`
- 1:N `QuestionInterviewEncounter`

### Topic (`topics`)
Назначение: справочник тем.

Поля:
- `id: string` — PK, `cuid()`
- `name: string` — unique
- `slug: string` — unique
- `createdAt: DateTime`
- `updatedAt: DateTime`

Связи:
- M:N с `Question` через `QuestionTopic`
- M:N с `TrainingPreset` через `TrainingPresetTopic`

### QuestionTopic (`question_topics`)
Назначение: join table question x topic.

Поля:
- `questionId: string`
- `topicId: string`
- `createdAt: DateTime`

Ключи и связи:
- composite PK: `(questionId, topicId)`
- FK `questionId -> Question.id`, `onDelete: Cascade`
- FK `topicId -> Topic.id`, `onDelete: Cascade`

Индексы:
- `topicId`

### QuestionInterviewEncounter (`question_interview_encounters`)
Назначение: per-user отметка, что вопрос встречался на реальном интервью.

Поля:
- `questionId: string`
- `userId: string`
- `createdAt: DateTime`

Ключи и связи:
- composite PK: `(questionId, userId)`
- FK `questionId -> Question.id`, `onDelete: Cascade`
- FK `userId -> User.id`, `onDelete: Cascade`

Индексы:
- `userId`

### QuestionChangeRequest (`question_change_requests`)
Назначение: moderation envelope вокруг create/update/delete published question.

Поля:
- `id: string` — PK, `cuid()`
- `type: QuestionChangeRequestType`
- `status: QuestionChangeRequestStatus`
- `targetQuestionId: string | null` — logical ref на live question
- `authorId: string`
- `reviewerId: string | null`
- `baseSnapshot: Json | null`
- `proposedSnapshot: Json | null`
- `reviewComment: string | null`
- `reviewedAt: DateTime | null`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Ключи и связи:
- FK `authorId -> User.id`, `onDelete: Restrict`
- FK `reviewerId -> User.id`, `onDelete: Restrict`
- физической FK на `Question` нет

Инварианты:
- `CREATE`: `baseSnapshot = null`
- `DELETE`: `proposedSnapshot = null`
- `PENDING` на один `targetQuestionId` допускается только один

Индексы:
- `(status, createdAt desc)`
- `(authorId, status, createdAt desc)`
- архитектурно также используется `(targetQuestionId, status)` и partial unique по pending

### TrainingPreset (`training_presets`)
Назначение: именованный набор тем для подготовки тренировки и интервью.

Поля:
- `id: string` — PK, `cuid()`
- `name: string` — unique
- `createdAt: DateTime`
- `updatedAt: DateTime`

Связи:
- 1:N `TrainingPresetTopic`
- 1:N `Interview`

### TrainingPresetTopic (`training_preset_topics`)
Назначение: ordered join preset x topic.

Поля:
- `presetId: string`
- `topicId: string`
- `position: number`
- `createdAt: DateTime`

Ключи и связи:
- composite PK: `(presetId, topicId)`
- FK `presetId -> TrainingPreset.id`, `onDelete: Cascade`
- FK `topicId -> Topic.id`, `onDelete: Cascade`

Индексы и инварианты:
- unique `(presetId, position)`
- index `topicId`

### TrainingSession (`training_sessions`)
Назначение: сохраненная история тренировки.

Поля:
- `id: string` — PK, `cuid()`
- `userId: string`
- `trainerId: string | null`
- `status: TrainingSessionStatus`
- `resultsCount: number`
- `correctCount: number`
- `incorrectCount: number`
- `partialCount: number`
- `feedback: string | null`
- `finishedAt: DateTime`
- `createdAt: DateTime`

Ключи и связи:
- FK `userId -> User.id`, `onDelete: Cascade`
- FK `trainerId -> User.id`, `onDelete: SetNull`
- 1:N `TrainingSessionResult`

Индексы:
- `(userId, finishedAt desc)`
- `(trainerId, finishedAt desc)`

### TrainingSessionResult (`training_session_results`)
Назначение: immutable snapshot одного ответа внутри сохраненной тренировки.

Поля:
- `id: string` — PK, `cuid()`
- `sessionId: string`
- `questionId: string` — logical ref на live question
- `questionText: string`
- `questionTextContent: Json` — snapshot `QuestionStructuredContent`
- `difficulty: smallint`
- `result: TrainingSessionResultMark`
- `position: number`
- `createdAt: DateTime`

Ключи и связи:
- FK `sessionId -> TrainingSession.id`, `onDelete: Cascade`
- физической FK на `Question` нет
- 1:N `TrainingSessionResultTopic`

Индексы:
- `(sessionId, position)`
- `(questionId, createdAt desc)`

### TrainingSessionResultTopic (`training_session_result_topics`)
Назначение: snapshot тем, относящихся к вопросу в момент сохранения результата.

Поля:
- `resultId: string`
- `topicId: string`
- `topicName: string`
- `topicSlug: string`

Ключи и связи:
- composite PK: `(resultId, topicId)`
- FK `resultId -> TrainingSessionResult.id`, `onDelete: Cascade`
- физической FK на `Topic` нет

Индексы:
- `topicId`

### InterviewCycle (`interview_cycles`)
Назначение: недельный цикл планирования интервью.

Поля:
- `id: string` — PK, `cuid()`
- `periodStart: DateTime`
- `periodEnd: DateTime`
- `mode: InterviewCycleMode`
- `createdByAdminId: string`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Ключи и связи:
- FK `createdByAdminId -> User.id`, `onDelete: Restrict`
- 1:N `Interview`

Индексы:
- `(periodStart, periodEnd)`
- `createdByAdminId`

### Interview (`interviews`)
Назначение: directed interview pair внутри цикла.

Поля:
- `id: string` — PK, `cuid()`
- `cycleId: string`
- `interviewerId: string`
- `intervieweeId: string`
- `plannedDate: DateTime | null`
- `presetId: string | null`
- `status: InterviewStatus`
- `completedAt: DateTime | null`
- `feedback: string | null`
- `resultsCount: number`
- `correctCount: number`
- `incorrectCount: number`
- `partialCount: number`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Ключи и связи:
- FK `cycleId -> InterviewCycle.id`, `onDelete: Cascade`
- FK `interviewerId -> User.id`, `onDelete: Restrict`
- FK `intervieweeId -> User.id`, `onDelete: Restrict`
- FK `presetId -> TrainingPreset.id`, `onDelete: Restrict`
- 1:N `InterviewQuestion`

Инварианты и индексы:
- unique `(cycleId, interviewerId, intervieweeId)`
- index `(plannedDate, status)`
- index `interviewerId`
- index `intervieweeId`
- index `cycleId`

### InterviewQuestion (`interview_questions`)
Назначение: immutable snapshot вопроса в runtime интервью.

Поля:
- `id: string` — PK, `cuid()`
- `interviewId: string`
- `questionId: string` — logical ref на live question
- `questionText: string`
- `questionTextContent: Json`
- `answer: string`
- `answerContent: Json`
- `difficulty: smallint`
- `result: TrainingSessionResultMark | null`
- `position: number`
- `createdAt: DateTime`

Ключи и связи:
- FK `interviewId -> Interview.id`, `onDelete: Cascade`
- физической FK на `Question` нет
- 1:N `InterviewQuestionTopic`

Индексы:
- `(interviewId, position)`
- `questionId`

### InterviewQuestionTopic (`interview_question_topics`)
Назначение: snapshot тем interview-question.

Поля:
- `interviewQuestionId: string`
- `topicId: string`
- `topicName: string`
- `topicSlug: string`

Ключи и связи:
- composite PK: `(interviewQuestionId, topicId)`
- FK `interviewQuestionId -> InterviewQuestion.id`, `onDelete: Cascade`
- физической FK на `Topic` нет

Индексы:
- `topicId`

## 4. Public API DTO model

### Auth

#### LoginDto
- `login: string`
- `password: string`

#### LoginResponseDto
- `accessToken: string`
- `expiresAt: string (date-time)`
- `profile: MeDto`

### Users

#### MeDto
- `id: string`
- `login: string`
- `email: string | null`
- `displayName: string`
- `role: UserRole`
- `status: UserStatus`

#### UserDto
- `id: string`
- `login: string`
- `email: string | null`
- `displayName: string`
- `role: UserRole`
- `status: UserStatus`
- `createdAt: date-time`
- `updatedAt: date-time`

#### CreateUserDto
- `login: string`
- `password: string`
- `displayName: string`
- `email?: string | null`
- `role: UserRole`

#### UpdateUserDto
- `displayName?: string`
- `email?: string | null`
- `role?: UserRole`

#### ResetUserPasswordDto
- `password: string`

#### ListUsersQueryDto
- `q?: string`
- `role?: UserRole`
- `status?: UserStatus`
- `limit?: number`
- `offset?: number`

#### ListUsersResponseDto
- `items: UserDto[]`
- `total: number`
- `meta.tookMs: number`
- `meta.appliedFilters.q: string | null`
- `meta.appliedFilters.role: UserRole | null`
- `meta.appliedFilters.status: UserStatus | null`

### Topics

#### TopicDto
- `id: string`
- `name: string`
- `slug: string`
- `questionsCount: number`

#### CreateTopicDto / UpdateTopicDto
- `name: string`

#### ListTopicsQueryDto
- `q?: string`
- `usedOnly?: boolean`
- `limit?: number`
- `offset?: number`

#### ListTopicsResponseDto
- `items: TopicDto[]`
- `total: number`
- `meta.tookMs: number`
- `meta.appliedFilters.q: string | null`
- `meta.appliedFilters.usedOnly: boolean`

### Companies

#### CompanyDto
- `id: string`
- `name: string`
- `questionsCount: number`

#### CreateCompanyDto / UpdateCompanyDto
- `name: string`

#### ListCompaniesQueryDto
- `q?: string`
- `limit?: number`
- `offset?: number`

#### ListCompaniesResponseDto
- `items: CompanyDto[]`
- `total: number`
- `meta.tookMs: number`
- `meta.appliedFilters.q: string | null`

### Questions

#### QuestionCompanyDto
- `id: string`
- `name: string`

#### QuestionTopicDto
- `id: string`
- `name: string`
- `slug: string`

#### QuestionInterviewEncounterDto
- `count: number`
- `checkedByCurrentUser: boolean`

#### QuestionPendingChangeRequestDto
- `hasPendingChangeRequest: boolean`
- `hasMyPendingChangeRequest: boolean`

#### QuestionStructuredContentDto
- `text: string`
- `code?: string`
- `codeLanguage?: QuestionCodeLanguage`

Transport limits:
- `text`: `maxLength 5000`
- `code`: `maxLength 5000`

#### QuestionDto
- `id: string`
- `text: string`
- `textContent: QuestionStructuredContentDto`
- `answer: string`
- `answerContent: QuestionStructuredContentDto`
- `difficulty: QuestionDifficulty`
- `company: QuestionCompanyDto | null`
- `topics: QuestionTopicDto[]`
- `createdAt: date-time`
- `updatedAt: date-time`
- `pendingChangeRequest: QuestionPendingChangeRequestDto`
- `interviewEncounter: QuestionInterviewEncounterDto`

#### CreateQuestionDto
- `textContent: QuestionStructuredContentDto`
- `answerContent: QuestionStructuredContentDto`
- `difficulty: QuestionDifficulty`
- `topicIds: string[]`
- `companyId?: string | null`

#### UpdateQuestionDto
- `textContent?: QuestionStructuredContentDto`
- `answerContent?: QuestionStructuredContentDto`
- `difficulty?: QuestionDifficulty`
- `topicIds?: string[]`
- `companyId?: string | null`

#### ListQuestionsQueryDto
- `difficulty?: QuestionDifficulty`
- `topic?: string` — name или slug
- `limit?: number`
- `offset?: number`

### Search

#### SearchSort
- `relevance`
- `newest`
- `popular`

#### SearchQuestionsQueryDto
- `q?: string`
- `difficulty?: QuestionDifficulty[]`
- `topicIds?: string[]`
- `companyQuery?: string`
- `sort?: SearchSort`
- `limit?: number`
- `offset?: number`

#### SearchQuestionsResponseDto
- `items: QuestionDto[]`
- `total: number`
- `meta.tookMs: number`
- `meta.appliedFilters.difficulty: QuestionDifficulty[]`
- `meta.appliedFilters.topicIds: string[]`
- `meta.appliedFilters.companyQuery: string | null`
- `meta.appliedFilters.sort: SearchSort`

### Question change requests / moderation

#### QuestionChangeRequestPayloadDto
- `textContent: QuestionStructuredContentDto`
- `answerContent: QuestionStructuredContentDto`
- `difficulty: QuestionDifficulty`
- `topicIds: string[]`
- `companyId?: string | null`

#### CreateQuestionChangeRequestDto
- `type: QuestionChangeRequestType`
- `targetQuestionId?: string`
- `payload?: QuestionChangeRequestPayloadDto`

#### RejectQuestionChangeRequestDto
- `reviewComment: string`

#### QuestionChangeRequestActorDto
- `id: string`
- `email: string | null`
- `displayName: string`
- `role: UserRole`

#### QuestionSnapshotDto
- `text: string`
- `textContent: QuestionStructuredContentDto`
- `answer: string`
- `answerContent: QuestionStructuredContentDto`
- `difficulty: QuestionDifficulty`
- `company: QuestionCompanyDto | null`
- `topics: QuestionSnapshotTopicDto[]`

#### QuestionChangeRequestSummaryDto
- `id: string`
- `type: QuestionChangeRequestType`
- `status: QuestionChangeRequestStatus`
- `targetQuestionId: string | null`
- `subject: string`
- `author: QuestionChangeRequestActorDto`
- `reviewer: QuestionChangeRequestActorDto | null`
- `reviewComment: string | null`
- `createdAt: date-time`
- `updatedAt: date-time`
- `reviewedAt: date-time | null`

#### QuestionChangeRequestDetailDto
Наследует `QuestionChangeRequestSummaryDto` и добавляет:
- `before: QuestionSnapshotDto | null`
- `after: QuestionSnapshotDto | null`
- `fieldDiffs.text: { changed, before, after }`
- `fieldDiffs.answer: { changed, before, after }`
- `fieldDiffs.difficulty: { changed, before, after }`
- `fieldDiffs.company: { changed, before, after }`
- `fieldDiffs.topics: { changed, before[], after[], added[], removed[] }`

### Training

#### TrainingParticipantDto
- `id: string`
- `login: string`
- `displayName: string`

#### TrainingPresetDto
- `id: string`
- `name: string`
- `topics: QuestionTopicDto[]`
- `createdAt: date-time`
- `updatedAt: date-time`

#### CreateTrainingPresetDto / UpdateTrainingPresetDto
- `name: string`
- `topicIds: string[]`

#### PrepareTrainingDto
- `topicIds: string[]`

#### PrepareTrainingResponseDto
- `items[]`:
  - `id`
  - `text`
  - `textContent`
  - `answer`
  - `answerContent`
  - `difficulty`
  - `topics: QuestionTopicDto[]`
  - `assignedTopic: QuestionTopicDto`
- `total: number`
- `meta.tookMs: number`
- `meta.requestedPerTopic: number`
- `meta.topicBreakdown[]`:
  - `topic: QuestionTopicDto`
  - `availableCount: number`
  - `selectedCount: number`

#### SaveTrainingResultsDto
- `targetUserId?: string`
- `feedback?: string`
- `status: TrainingSessionStatus`
- `items[]`:
  - `questionId: string`
  - `difficulty: QuestionDifficulty`
  - `topicIds: string[]`
  - `result: TrainingResult`

#### SaveTrainingResultsResponseDto
- `id: string`
- `status: TrainingSessionStatus`
- `resultsCount: number`
- `correctCount: number`
- `incorrectCount: number`
- `partialCount: number`
- `finishedAt: date-time`

#### TrainingHistorySessionDto
- `id: string`
- `status: TrainingSessionStatus`
- `resultsCount: number`
- `correctCount: number`
- `incorrectCount: number`
- `partialCount: number`
- `feedback: string | null`
- `trainer: { id, login, displayName } | null`
- `finishedAt: date-time`

#### TrainingHistoryDetailResponseDto
Наследует `TrainingHistorySessionDto` и добавляет `results[]`:
- `questionId: string`
- `text: string`
- `textContent: QuestionStructuredContentDto`
- `difficulty: QuestionDifficulty`
- `result: TrainingResult`
- `position: number`
- `topics: QuestionTopicDto[]`

#### ListTrainingHistoryResponseDto
- `items: TrainingHistorySessionDto[]`

#### ListTrainingParticipantsResponseDto
- `items: TrainingParticipantDto[]`

### Interviews

#### InterviewUserDto
- `id: string`
- `login: string`
- `displayName: string`

#### InterviewPresetDto
- `id: string`
- `name: string`

#### InterviewResultsSummaryDto
- `resultsCount: number`
- `correctCount: number`
- `incorrectCount: number`
- `partialCount: number`

#### InterviewItemDto
Наследует `InterviewResultsSummaryDto` и содержит:
- `id: string`
- `status: InterviewStatus`
- `plannedDate: date | null`
- `preset: InterviewPresetDto | null`
- `interviewer: InterviewUserDto`
- `interviewee: InterviewUserDto`
- `completedAt: date-time | null`

#### InterviewCycleDetailDto
- `id: string`
- `mode: InterviewCycleMode`
- `periodStart: date`
- `periodEnd: date`
- `createdByAdmin: InterviewUserDto`
- `interviews: InterviewItemDto[]`

#### InterviewCycleDetailResponseDto
Наследует `InterviewCycleDetailDto` и добавляет:
- `draftCount`
- `plannedCount`
- `scheduledCount`
- `completedCount`

#### CreateInterviewCycleDto
- `periodStart: date`
- `periodEnd: date`
- `participantIds: string[]`

#### CreateInterviewPairDto
- `interviewerId: string`
- `intervieweeId: string`

#### UpdateInterviewDto
- `interviewerId?: string | null`
- `intervieweeId?: string | null`
- `plannedDate?: date | null`
- `presetId?: string | null`
- `feedback?: string | null`

#### InterviewCalendarQueryDto
- `month?: string` — формат `YYYY-MM`

#### AdminInterviewCalendarResponseDto
- `month: string`
- `days: { date: date }[]`
- `items: InterviewItemDto[]`
- `activeCycle: InterviewCycleDetailDto | null`

#### MyInterviewCalendarItemDto
Наследует `InterviewItemDto` и добавляет:
- `myRole: 'interviewer' | 'interviewee'`

#### MyInterviewCalendarResponseDto
- `month: string`
- `days: { date: date }[]`
- `items: MyInterviewCalendarItemDto[]`

#### InterviewRuntimeResponseDto
- `interview: InterviewItemDto`
- `counterpart: InterviewUserDto`
- `items[]`:
  - `id: string`
  - `questionId: string`
  - `questionText: string`
  - `questionTextContent: QuestionStructuredContentDto`
  - `answer: string`
  - `answerContent: QuestionStructuredContentDto`
  - `difficulty: QuestionDifficulty`
  - `position: number`
  - `topics: QuestionTopicDto[]`

#### CompleteInterviewDto
- `feedback?: string`
- `items[]`:
  - `interviewQuestionId: string`
  - `result: TrainingResult`

#### InterviewDashboardQueryDto
- `from?: date`
- `to?: date`

#### AdminInterviewDashboardResponseDto
- `summary`:
  - `totalInterviews`
  - `draftCount`
  - `plannedCount`
  - `scheduledCount`
  - `completedCount`
  - `resultsCount`
  - `correctCount`
  - `incorrectCount`
  - `partialCount`
- `scheduleSeries[]`:
  - `bucketStart`
  - `draftCount`
  - `plannedCount`
  - `scheduledCount`
  - `completedCount`
  - `overdueCount`
- `outcomeMix`:
  - `correctCount`
  - `partialCount`
  - `incorrectCount`
- `interviewerLoad[]`:
  - `interviewer: InterviewUserDto`
  - `assignedCount`
  - `completedCount`
- `weakTopics: InterviewWeakTopicDto[]`
- `upcoming: InterviewItemDto[]`
- `recentCompleted: InterviewItemDto[]`

#### MyInterviewDashboardResponseDto
- `summary` — та же структура
- `outcomeSeries[]`:
  - `bucketStart`
  - `correctCount`
  - `partialCount`
  - `incorrectCount`
- `weakTopics: InterviewWeakTopicDto[]`
- `feedbackEntries: InterviewFeedbackEntryDto[]`
- `recentInterviews: InterviewItemDto[]`

### Analytics

#### BankAnalyticsResponseDto
- `totalQuestions: number`
- `dominantDifficulty: QuestionDifficulty | null`
- `difficultyMix[]`:
  - `difficulty`
  - `count`
  - `share`
- `topTopics[]`:
  - `topicId`
  - `name`
  - `slug`
  - `count`
- `sparseTopics[]`:
  - `topicId`
  - `name`
  - `slug`
  - `count`

#### GrowthAnalyticsResponseDto
- `summary`:
  - `totalResults`
  - `correctCount`
  - `incorrectCount`
  - `partialCount`
  - `accuracy`
- `feedbackEntries[]`:
  - `sessionId`
  - `trainer: { id, displayName, login } | null`
  - `feedback`
  - `finishedAt`
- `weakTopics[]`:
  - `topicId`
  - `name`
  - `slug`
  - `correctCount`
  - `incorrectCount`
  - `partialCount`
  - `accuracy`
- `failedQuestions[]` и `answeredQuestions[]`:
  - `questionId`
  - `text`
  - `textContent`
  - `difficulty`
  - `topics`
  - `correctCount`
  - `incorrectCount`
  - `partialCount`
  - `lastResult`
  - `lastAnsweredAt`

## 5. Главные архитектурные правила по данным

- Live bank живет в `Question`, а история и runtime-контуры работают на snapshots.
- `QuestionChangeRequest`, `TrainingSessionResult`, `InterviewQuestion` держат logical reference на вопрос через `questionId`, но без FK.
- `TrainingSessionResultTopic` и `InterviewQuestionTopic` хранят денормализованный snapshot темы, а не live relation.
- Любые API read-модели поверх `QuestionDto` добавляют два вычисляемых состояния: `pendingChangeRequest` и `interviewEncounter`.
- Query DTO и response DTO являются публичным контрактом; изменение поля, enum или формата требует синхронного обновления OpenAPI и frontend SDK.
