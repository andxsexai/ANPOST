# ANPOST

**Код:** [github.com/andxsexai/ANPOST](https://github.com/andxsexai/ANPOST)  
**Открыть на телефоне:** один раз [Deploy on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fandxsexai%2FANPOST&project-name=anpost&repository-name=ANPOST) → ссылка `*.vercel.app` → «На экран Домой». Подробно: [DEPLOY.md](./DEPLOY.md).

Автоматизированный OSINT-контур для постинга: **10 открытых новостных лент**, **6 человеческих ниш**, разбор ролика по публичной ссылке и посадка текста на Instagram / Threads / TikTok / VK.

> Открытые источники. Понимание изнутри. Сервис без границ — в пределах публичного контура.

Стиль интерфейса: editorial capital (как [Blink Capital на Siteinspire](https://www.siteinspire.com/website/13511-blink-capital)) × фиолетовый кибер-неон. Продуктовый ориентир по смыслу — [Trendsee](https://trendsee.io/): ссылка → идея → сценарий. Не копия чужого ролика, а структура и свой текст.

---

## Задача 1. Разбор [daily-social-autopost](https://github.com/Lee-unhn/daily-social-autopost.git)

Лёгкий Python toolkit (stdlib only): раз в день берёт GitHub Trending / Hacker News, рисует картинку в локальном ComfyUI и постит **одну картинку + три подписи** в Instagram + Facebook Page + Threads.

| Модуль | Что делает | Боль |
|---|---|---|
| `fetch_topic.py` | GitHub Search API + HN top stories | Только два западных входа, нет UI |
| `gen_image.py` | ComfyUI DreamShaper / Animagine | Только `127.0.0.1:8188` |
| `publish_ig.py` | ImgBB → Graph `/media` → poll → `/media_publish` | Нужен Creator/Business + `PAGE_TOKEN` |
| `publish_fb.py` | Фото на **Page** | Личный профиль Facebook API не публикует |
| `publish_threads.py` | `graph.threads.net`, лимит ~480 знаков | Токен отдельно, IG не кросс-постит |
| `publish_all.py` | Картинка один раз, три канала | Падение одного канала не останавливает остальные |
| `notify.py` / `emailer.py` | Письмо об успехе/фейле | Иначе «тихий» пропущенный день |

Полезное, что ANPOST сохраняет: **платформенные тексты пишутся раздельно**, секреты не в коде, публикация — только официальными Graph API.

Что закрываем мы: интерфейс, десять мировых OSINT-лент, ниши, разбор видео, карта слепых зон.

---

## Стек

- Next.js 16 App Router + TypeScript
- Tailwind v4, Unbounded / Manrope
- Публичные RSS + oEmbed + YouTube timedtext (если субтитры открыты)
- Без обязательных облачных ключей

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

---

## 10 открытых источников

| # | Источник | Регион | Affiliation |
|---|---|---|---|
| 1 | NPR News | США | public |
| 2 | CNN World | США | independent |
| 3 | TechCrunch | США | independent |
| 4 | Yonhap News | Корея | agency |
| 5 | NHK News | Япония | public |
| 6 | CGTN World | Китай | state |
| 7 | ТАСС | Россия | agency |
| 8 | РИА Новости | Россия | agency |
| 9 | Интерфакс | Россия | agency |
| 10 | Лента.ру | Россия | independent |

Affiliation специально вынесен наружу: OSINT без пометки «state / agency / public» — это уже дыра в безопасности смысла.

---

## Ниши

Деньги · Новости · Инновации · Отношения · Здоровье · Духовность.

---

## Видео по ссылке

`/analyze` принимает публичный URL.

- **YouTube** — oEmbed + публичные субтитры (`captionTracks` / timedtext), если автор их включил.
- **TikTok / VK** — официальный oEmbed.
- **Instagram** — публичные метаданные / oEmbed, без обхода логина.

Дальше: о чём ролик, покадровая расшифровка (если есть), оригинальный сценарий и **аналогичный текст** под выбранную нишу + подписи для площадок.

Это не выгрузка чужого приватного контента и не взлом плеера.

---

## Граница, которую мы не переходим

ANPOST — автоматизированный сервис **на базе открытых источников**. Он создаёт безопасность понимания: кто говорит, кто молчит, где слепая зона, какие боли были у исходного пайплайна.

Он **не**:

- не обходит авторизацию соцсетей
- не пишет эксплойты и не снимает чужие сессии
- не публикует в ваши аккаунты без ваших официальных токенов

Публикация в Graph API остаётся за оператором. Интеллект — за открытым контуром.

---

## Маршруты

| Путь | Смысл |
|---|---|
| `/` | Манифест |
| `/feed` | Живая лента |
| `/niches` | Шесть потребностей |
| `/analyze` | Ссылка → сценарий |
| `/studio` | Три платформенных текста |
| `/osint` | Бриф слепых зон и болей |
| `/sources` | Карта десяти входов |

API: `GET /api/feed`, `POST /api/analyze`, `POST /api/script`, `POST /api/compose`.
