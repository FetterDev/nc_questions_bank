# Prod VM Local Overlay Example

Этот файл не должен содержать секреты. Он нужен как локальная памятка для конкретного окружения.

Пример структуры:

```md
# Prod VM Local Overlay

## Current Targets
- Proxmox UI: `https://192.168.0.153:8006/`
- Proxmox public SSH host: `144.31.80.132`
- Prod VM SSH target: `root@192.168.0.124`
- Public domain: `xn--90aizld4d.xn--p1ai`

## Runtime Paths
- Release dir: `/opt/nord-releases`
- Runtime env file: `/opt/nord/.env.public`
- Compose project: `compose`

## Caveats
- Не использовать `/opt/nord` как source of truth для нового релиза.
- Если Proxmox UI credentials отсутствуют локально, дописать их в `docs/prod-vm-secrets.local.env`.
```
