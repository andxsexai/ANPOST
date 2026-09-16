# Как открыть ANPOST на телефоне

## Где код

**GitHub:** [github.com/andxsexai/ANPOST](https://github.com/andxsexai/ANPOST)

Репозиторий — исходники. В Safari на телефоне он **не** запускает Next.js сам по себе.

## Ошибка `404 DEPLOYMENT_NOT_FOUND`

Это значит: по ссылке Vercel **нет ни одного успешного деплоя** (проект не создан, сборка упала или ссылка старая).

1. [vercel.com/dashboard](https://vercel.com/dashboard) → **Add New… → Project** → Import **andxsexai/ANPOST**.
2. **Deploy** и дождись зелёного **Ready**.
3. Открывай только URL из вкладки **Visit** / **Domains** этого проекта, не закладку с preview-id.

Если проект уже есть, но 404: **Deployments → … → Redeploy** (последний коммит `main`).

---

## Живой сайт (1 раз, ~2 минуты)

1. Открой **[Deploy on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fandxsexai%2FANPOST&project-name=anpost&repository-name=ANPOST)** на компьютере или телефоне.
2. Войди через GitHub → Import `andxsexai/ANPOST` → **Deploy**.
3. После сборки Vercel даст URL, например `https://anpost-xxxx.vercel.app`.

Опционально в Vercel → Settings → Environment Variables:

- `OPENAI_API_KEY` — Whisper для озвучки Instagram/Reels, когда публичная подпись короткая
- `CRON_SECRET` — для автообновления ленты по cron
- `ANPOST_OPERATOR_SECRET` — для `/api/telegram/*` на проде
- `TELEGRAM_BOT_TOKEN` — только в `.env.local`, не в git

## Иконка на экране (как приложение)

- **iPhone:** Safari → Поделиться → **На экран «Домой»**
- **Android:** Chrome → **Установить приложение** / «Добавить на главный экран»

В проекте включены `manifest.ts` и standalone-режим — без адресной строки.

## Свой домен

Vercel → Project → Settings → Domains → добавь домен и укажи DNS.

Задай `NEXT_PUBLIC_SITE_URL=https://твой-домен.ru` в переменных окружения.
