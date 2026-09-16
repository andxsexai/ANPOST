# Как открыть ANPOST на телефоне

## Где код

**GitHub:** [github.com/andxsexai/ANPOST](https://github.com/andxsexai/ANPOST)

Репозиторий — исходники. В Safari на телефоне он **не** запускает Next.js сам по себе.

## Живой сайт (1 раз, ~2 минуты)

1. Открой **[Deploy on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fandxsexai%2FANPOST&project-name=anpost&repository-name=ANPOST)** на компьютере или телефоне.
2. Войди через GitHub → Import `andxsexai/ANPOST` → **Deploy**.
3. После сборки Vercel даст URL, например `https://anpost-xxxx.vercel.app`.

Опционально в Vercel → Settings → Environment Variables:

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
