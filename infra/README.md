# Infra

Прод-выкат на VM в Proxmox:

- tracked runbook: `docs/prod-vm-runbook.md`
- локальный overlay без git: `docs/prod-vm-runbook.local.md`
- локальные секреты без git: `docs/prod-vm-secrets.local.env`

Для штатного prod deploy использовать именно этот runbook. Локальный `docker-compose.prod.yml` не считать заменой prod VM runbook.

Прод-сборка и запуск (полный стек: frontend + backend + db):

```bash
cp .env.example .env
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env up -d --build
```

Сервисы:
- `postgres` - БД PostgreSQL с volume `postgres_data`
- `backend-migrate` - одноразовый запуск `prisma migrate deploy` и `npm run bootstrap:admin`
- `backend` - NestJS API
- `frontend` - nginx + статический фронт и прокси `/api`

Минимальные auth env для запуска:
- `JWT_SECRET`
- `JWT_TTL_HOURS`
- `BOOTSTRAP_ADMIN_LOGIN`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_DISPLAY_NAME`
- `BOOTSTRAP_ADMIN_EMAIL`

Важно:
- до первого деплоя создай и закоммить миграции Prisma из `backend/prisma/migrations`:
```bash
npm run prisma:migrate:dev -w backend -- --name init
```

Проверка:

```bash
curl http://localhost:${FRONTEND_PORT:-80}/
curl http://localhost:${FRONTEND_PORT:-80}/api/health
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env ps
```

Вариант только для backend + db:

```bash
cp .env.example .env
docker compose -f infra/compose/docker-compose.backend.yml --env-file .env up -d --build
curl http://localhost:${BACKEND_PORT:-3000}/api/health
```

После первого запуска вход выполняется через `/login` логином и паролем из `BOOTSTRAP_ADMIN_*`.

Локальный dev-запуск без полного docker-compose:

```bash
./run-local.sh
```

Скрипт:
- подхватывает `.env` из корня и `backend/.env`, если они существуют;
- чистит runtime-порты `postgres`, `backend`, `frontend`;
- поднимает локальный PostgreSQL, если `DATABASE_URL` не задан;
- применяет миграции, запускает `bootstrap:admin`, сидирует question bank;
- регенерирует `backend/openapi.json` и frontend SDK;
- ждёт готовности backend/frontend и печатает итоговые URL в консоль.
