# Infra architecture

## Диаграммы
- Редактируемая системная диаграмма лежит в `docs/architecture/system-landscape.drawio`.
- Эта диаграмма является обзорным source of truth для внешнего контура доставки: browser/frontend, nginx, backend API, PostgreSQL, `backend-migrate`, Docker Compose.
- При изменении `compose/*`, `nginx/*`, `docker/*`, `run-local.sh` или topology входящего трафика диаграмма обновляется в том же change set.

## Текущая архитектура
- Прод-запуск: Docker Compose.
- Файлы:
  - `infra/compose/docker-compose.prod.yml` (frontend + backend + db),
  - `infra/compose/docker-compose.backend.yml` (backend + db).
- Сервисы:
  - `postgres`: основная БД (PostgreSQL 16).
  - `backend-migrate`: одноразовый контейнер для `prisma migrate deploy` и `bootstrap:admin`.
  - `backend`: NestJS API на порту `3000` внутри сети.
  - `frontend`: nginx со статикой Vue.
- Сеть: `bridge`-сеть `app`.
- Данные БД: named volume `postgres_data`.
- Для локального запуска через корневой `run-local.sh` `postgres` в `infra/compose/docker-compose.backend.yml` публикует порт `5432` на хост (`${POSTGRES_PORT:-5432}:5432`).

## Маршрутизация трафика
- Входящий трафик приходит в `frontend` (nginx) на порт `80` контейнера.
- `GET /` и прочие не-API пути: отдаются как SPA (`index.html`).
- `/*` под `/api/`: проксируются nginx в `http://backend:3000/api/`.

## Порядок старта
- `postgres` стартует и проходит healthcheck.
- `backend-migrate` выполняет `prisma migrate deploy`, затем `bootstrap:admin` и завершается.
- `backend` стартует только после успешных миграций.
- `frontend` (если включен выбранным compose-файлом) стартует после healthcheck `backend`.
- В миграционный слой теперь входят не только published question bank таблицы, но и auth/moderation таблицы (`users`, `question_change_requests`), поля локального login/password auth и partial unique index для pending-заявок.

## Границы ответственности
- `infra` отвечает за упаковку, запуск, сетевую связность и reverse-proxy.
- `infra` не отвечает за реализацию UI и API-логики.

## Build pipeline
- `infra/docker/frontend.Dockerfile` использует `backend/openapi.json` как входной контракт.
- Перед сборкой статики frontend внутри image build выполняется регенерация SDK через `npm run build:with-sdk`.

## Локальный bootstrap
- Корневой `run-local.sh`:
  - сначала подхватывает `.env` из корня и `backend/.env`, если они есть;
  - в начале освобождает runtime-порты `backend`, `frontend` и локального `postgres`, если `DATABASE_URL` не задан;
  - поднимает локальный PostgreSQL через `infra/compose/docker-compose.backend.yml`, если `DATABASE_URL` не задан;
  - применяет все Prisma-миграции;
  - запускает `bootstrap:admin` c env-переменными `JWT_*` и `BOOTSTRAP_ADMIN_*`;
  - загружает published seed question bank;
  - регенерирует backend OpenAPI и frontend SDK перед стартом приложений.
  - ждёт HTTP-готовности backend и frontend;
  - после старта явно печатает `postgres`, `backend`, `frontend` и `api docs` URL в консоль.
