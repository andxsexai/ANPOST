import { PageShell } from "@/components/site-chrome";
import { TelegramDesk } from "@/components/telegram-desk";

export default function TelegramPage() {
  return (
    <PageShell
      eyebrow="TELEGRAM DESK"
      title="Своя страница. Свой стиль. Один бот."
      kicker="Добавь @andxshop_bot админом в канал, задай TELEGRAM_CHANNEL_ID. Команды: /news — список новостей ANPOST, /post 3 — выложить №3 в канал. Пересланный пост — переписка без подмены смысла."
    >
      <TelegramDesk />
    </PageShell>
  );
}
