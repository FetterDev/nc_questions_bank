# Prod VM Runbook

Runbook для штатного выката на prod VM в Proxmox.

## Source Of Truth

- Исходник релиза: только коммит, уже запушенный в GitHub.
- Артефакт релиза: tarball exact commit из GitHub.
- Целевой runtime: отдельный release-dir на VM в `${PROD_RELEASES_DIR}/${DEPLOY_SHA}`.
- Runtime env остаётся на VM в `${PROD_RUNTIME_ENV_FILE}`.

## Обязательные входы

Перед началом агент обязан прочитать:

1. `docs/prod-vm-runbook.md`
2. `docs/prod-vm-runbook.local.md`, если файл существует
3. `docs/prod-vm-secrets.local.env`, если файл существует

Если локальные файлы отсутствуют, deploy не выполнять.

## Жёсткие правила

- Не деплоить грязное рабочее дерево.
- Не деплоить незакоммиченные изменения.
- Перед прод-выкатом обязателен `git commit` и `git push`.
- Штатный путь выката: GitHub commit -> GitHub tarball -> release-dir на VM -> `docker compose up -d --build`.
- Не использовать `/opt/nord` как source of truth для нового релиза.
- Не менять `${PROD_RUNTIME_ENV_FILE}` "по пути", если это не отдельная задача.
- Не печатать секреты из `docs/prod-vm-secrets.local.env` в чат.

## Репозиторные файлы, которые нужны для выката

- `infra/compose/docker-compose.vm.yml`
- `infra/caddy/Caddyfile`
- `infra/docker/backend.Dockerfile`
- `infra/docker/frontend.Dockerfile`
- `infra/nginx/default.conf`

Эти файлы должны быть в том самом GitHub commit, который катится в прод.

## Предвыкатная локальная проверка

Из корня репозитория:

```bash
git status --short --branch
git diff --stat
```

Если рабочее дерево грязное, сначала привести его в состояние, которое можно коммитить.

Минимальная проверка перед выкладкой:

```bash
(cd backend && npm run build)
(cd frontend && npm run build)
```

Если задача меняет только часть системы, добавить минимально достаточную таргетную проверку по затронутой области до коммита.

## Обязательный GitHub Commit

```bash
git add <нужные_файлы>
git commit -m "<осмысленный commit message>"
git push origin HEAD
DEPLOY_SHA="$(git rev-parse HEAD)"
```

Проверка:

```bash
git status --short --branch
git rev-parse HEAD
```

После этого `DEPLOY_SHA` становится идентификатором релиза.

## Локальная загрузка exact commit из GitHub

```bash
set -a
source docs/prod-vm-secrets.local.env
set +a

test -n "$GITHUB_REPO_SLUG"
test -n "$GITHUB_DEPLOY_TOKEN"
test -n "$PROD_VM_HOST"
test -n "$PROD_VM_USER"
test -n "$PROD_RELEASES_DIR"
test -n "$PROD_RUNTIME_ENV_FILE"
test -n "$PROD_COMPOSE_PROJECT"

DEPLOY_SHA="$(git rev-parse HEAD)"
```

Загрузка exact commit tarball и распаковка на VM:

```bash
curl -fsSL \
  -H "Authorization: Bearer $GITHUB_DEPLOY_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_REPO_SLUG/tarball/$DEPLOY_SHA" \
| ssh "${PROD_VM_USER}@${PROD_VM_HOST}" "
  set -euo pipefail
  release='${PROD_RELEASES_DIR}/${DEPLOY_SHA}'
  rm -rf \"\$release\"
  mkdir -p \"\$release\"
  tar -xzf - --strip-components=1 -C \"\$release\"
"
```

Проверка, что release-dir появился:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" "test -d '${PROD_RELEASES_DIR}/${DEPLOY_SHA}'"
```

## Deploy На VM

Сначала валидация compose-конфига:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" "
  set -euo pipefail
  cd '${PROD_RELEASES_DIR}/${DEPLOY_SHA}/infra/compose'
  docker compose \
    --project-name '${PROD_COMPOSE_PROJECT}' \
    --env-file '${PROD_RUNTIME_ENV_FILE}' \
    -f docker-compose.vm.yml \
    config >/dev/null
"
```

Потом реальный deploy:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" "
  set -euo pipefail
  cd '${PROD_RELEASES_DIR}/${DEPLOY_SHA}/infra/compose'
  docker compose \
    --project-name '${PROD_COMPOSE_PROJECT}' \
    --env-file '${PROD_RUNTIME_ENV_FILE}' \
    -f docker-compose.vm.yml \
    up -d --build
"
```

## Обязательная Проверка После Выката

Статусы контейнеров:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" \
  "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}'"
```

Публичный health:

```bash
curl -fsS "https://${PUBLIC_DOMAIN}/api/health"
curl -I "https://${PUBLIC_DOMAIN}/"
```

Проверка, что runtime уже смотрит на новый release-dir:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" \
  "docker inspect -f '{{ index .Config.Labels \"com.docker.compose.project.working_dir\" }}' nord-backend nord-frontend nord-edge"
```

Минимум один read-only smoke по затронутой области обязателен. Пример для логина и API:

```bash
ADMIN_PASSWORD="$(ssh "${PROD_VM_USER}@${PROD_VM_HOST}" \
  "awk -F= '/^BOOTSTRAP_ADMIN_PASSWORD=/{print \$2}' '${PROD_RUNTIME_ENV_FILE}'")"

TOKEN="$(
  curl -fsS \
    -H 'content-type: application/json' \
    -d "{\"login\":\"nord.admin\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "https://${PUBLIC_DOMAIN}/api/auth/login" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["accessToken"])'
)"
```

Дальше вызвать один read-only endpoint, относящийся к изменению текущего релиза.

## Rollback

Найти предыдущий release-dir:

```bash
ssh "${PROD_VM_USER}@${PROD_VM_HOST}" \
  "ls -1dt '${PROD_RELEASES_DIR}'/* | sed -n '2p'"
```

Откат:

```bash
PREV_RELEASE="$(ssh "${PROD_VM_USER}@${PROD_VM_HOST}" \
  "ls -1dt '${PROD_RELEASES_DIR}'/* | sed -n '2p'")"

ssh "${PROD_VM_USER}@${PROD_VM_HOST}" "
  set -euo pipefail
  cd \"${PREV_RELEASE}/infra/compose\"
  docker compose \
    --project-name '${PROD_COMPOSE_PROJECT}' \
    --env-file '${PROD_RUNTIME_ENV_FILE}' \
    -f docker-compose.vm.yml \
    up -d --build
"
```

После rollback повторить блок проверок из раздела "Обязательная Проверка После Выката".

## Proxmox Fallback

Если VM недоступна по SSH, использовать Proxmox только как аварийный контур:

- открыть `${PROXMOX_UI_URL}`, если переменная есть в `docs/prod-vm-secrets.local.env`;
- найти целевую VM по `docs/prod-vm-runbook.local.md`;
- использовать консоль/перезапуск только если SSH в VM недоступен.

Proxmox не является основным путём выката. Основной путь выката идёт напрямую на prod VM.

## Известные Грабли

- Старое дерево `/opt/nord` на VM не считать надёжным источником релиза.
- `docker-compose.vm.yml` и `infra/caddy/Caddyfile` должны быть в GitHub commit, иначе релиз неполный.
- `backend-migrate` зависит от `backend/scripts/bootstrap-admin.js`; runtime image backend обязан включать каталог `scripts`.
- На VM ранее был сломан `origin` из-за `core.sshCommand`, указывающего на ключ с Mac. Для штатного deploy через runbook это не важно, потому что release доставляется как GitHub tarball exact commit с локальной машины.
