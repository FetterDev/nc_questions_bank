# Domain model graph

Источник: `backend/prisma/schema.prisma` и `backend/ARCHITECTURE.md`.

- Сплошная стрелка: физическая FK-связь.
- Пунктирная стрелка: logical reference или snapshot reference без Prisma relation.
- `drawio` остается редактируемым source of truth, этот файл нужен для быстрого чтения и diff-review.

```mermaid
flowchart LR
  classDef ref fill:#e0f2fe,stroke:#0ea5e9,color:#0f172a,stroke-width:1px;
  classDef core fill:#fef3c7,stroke:#f59e0b,color:#0f172a,stroke-width:1px;
  classDef join fill:#f8fafc,stroke:#94a3b8,color:#0f172a,stroke-width:1px;
  classDef snapshot fill:#fee2e2,stroke:#ef4444,color:#0f172a,stroke-width:1px;
  classDef note fill:#f8fafc,stroke:#cbd5e1,color:#475569,stroke-dasharray: 5 5;

  subgraph reference["Справочники и auth"]
    direction TB
    User["User<br/>Локальная auth-сущность<br/>PK id<br/>login, role, status, tokenVersion"]
    Company["Company<br/>Справочник компаний<br/>PK id<br/>name (unique)"]
    Topic["Topic<br/>Справочник тем<br/>PK id<br/>name, slug (unique)"]
  end

  subgraph bank["Question bank и moderation"]
    direction TB
    Question["Question<br/>Опубликованный вопрос<br/>PK id<br/>FK companyId?<br/>difficulty, textContent, answerContent"]
    QuestionTopic["QuestionTopic<br/>M:N Question x Topic<br/>PK questionId + topicId"]
    Encounter["QuestionInterviewEncounter<br/>Метка 'встречал на собесе'<br/>PK questionId + userId"]
    ChangeRequest["QuestionChangeRequest<br/>Заявка на create/update/delete<br/>PK id<br/>FK authorId, reviewerId?<br/>targetQuestionId, baseSnapshot, proposedSnapshot"]
  end

  subgraph training["Тренировки"]
    direction TB
    TrainingPreset["TrainingPreset<br/>Именованный набор тем<br/>PK id<br/>name"]
    TrainingPresetTopic["TrainingPresetTopic<br/>Упорядоченная связь preset x topic<br/>PK presetId + topicId<br/>position"]
    TrainingSession["TrainingSession<br/>Сохраненная тренировка<br/>PK id<br/>FK userId, trainerId?<br/>status, feedback, counters"]
    TrainingResult["TrainingSessionResult<br/>Snapshot ответа по вопросу<br/>PK id<br/>FK sessionId<br/>questionId, difficulty, result, position"]
    TrainingResultTopic["TrainingSessionResultTopic<br/>Snapshot тем результата<br/>PK resultId + topicId<br/>topicName, topicSlug"]
  end

  subgraph interviews["Интервью"]
    direction TB
    InterviewCycle["InterviewCycle<br/>Недельный контейнер планирования<br/>PK id<br/>FK createdByAdminId<br/>periodStart, periodEnd, mode"]
    Interview["Interview<br/>Directed interview pair<br/>PK id<br/>FK cycleId, interviewerId, intervieweeId, presetId?<br/>status, plannedDate, feedback, counters"]
    InterviewQuestion["InterviewQuestion<br/>Snapshot вопроса в runtime интервью<br/>PK id<br/>FK interviewId<br/>questionId, answerContent, result, position"]
    InterviewQuestionTopic["InterviewQuestionTopic<br/>Snapshot тем interview-question<br/>PK interviewQuestionId + topicId<br/>topicName, topicSlug"]
  end

  Company -->|"1 : 0..n companyId"| Question
  Question -->|"1 : 0..n"| QuestionTopic
  Topic -->|"1 : 0..n"| QuestionTopic
  Question -->|"1 : 0..n"| Encounter
  User -->|"1 : 0..n"| Encounter
  User -->|"authorId"| ChangeRequest
  User -->|"reviewerId?"| ChangeRequest
  ChangeRequest -.->|"logical ref: targetQuestionId"| Question

  TrainingPreset -->|"1 : 0..n"| TrainingPresetTopic
  Topic -->|"1 : 0..n"| TrainingPresetTopic
  User -->|"target user"| TrainingSession
  User -->|"trainerId?"| TrainingSession
  TrainingSession -->|"1 : 0..n"| TrainingResult
  TrainingResult -->|"1 : 0..n"| TrainingResultTopic
  TrainingResult -.->|"snapshot ref: questionId"| Question
  TrainingResultTopic -.->|"snapshot ref: topicId + name + slug"| Topic

  User -->|"createdByAdminId"| InterviewCycle
  InterviewCycle -->|"1 : 0..n"| Interview
  User -->|"interviewerId"| Interview
  User -->|"intervieweeId"| Interview
  TrainingPreset -->|"presetId?"| Interview
  Interview -->|"1 : 0..n"| InterviewQuestion
  InterviewQuestion -->|"1 : 0..n"| InterviewQuestionTopic
  InterviewQuestion -.->|"snapshot ref: questionId"| Question
  InterviewQuestionTopic -.->|"snapshot ref: topicId + name + slug"| Topic

  NoteLive["Live entities<br/>Изменяются через CRUD / moderation / orchestration"]:::note
  NoteSnapshot["Snapshot entities<br/>Фиксируют историческое состояние и не зависят от будущих правок банка"]:::note

  Question --- NoteLive
  TrainingResult --- NoteSnapshot
  InterviewQuestion --- NoteSnapshot

  class User,Company,Topic ref
  class Question,TrainingPreset,TrainingSession,InterviewCycle,Interview core
  class QuestionTopic,Encounter,TrainingPresetTopic join
  class ChangeRequest,TrainingResult,TrainingResultTopic,InterviewQuestion,InterviewQuestionTopic snapshot
```

## Краткая семантика моделей

- `User` управляет доступом, модерацией, тренировками и интервью, но в каждом контуре выступает в своей роли.
- `Company` и `Topic` это контролируемые справочники, на которые опирается опубликованный банк и сценарии подготовки.
- `Question` это только live-версия опубликованного вопроса; история изменений в ней не хранится.
- `QuestionChangeRequest` держит workflow модерации и before/after snapshots, а не полноценную FK-модель на все вложенные объекты.
- `TrainingSession*` это исторический слепок тренировки; данные специально денормализованы, чтобы аналитика не ломалась после правок банка.
- `Interview*` повторяет тот же snapshot-подход для отдельного weekly interview-контура.
