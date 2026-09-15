import { PageShell } from "@/components/site-chrome";
import { TelegramDesk } from "@/components/telegram-desk";

export default function TelegramPage() {
  return (
    <PageShell
      eyebrow="TELEGRAM DESK"
      title="Своя страница. Свой стиль. Один бот."
      kicker="Подключи канал к @andxshop_bot, перешли пост — получи тот же смысл, только легче читать. Без шаблона «холод и жар»."
    >
      <TelegramDesk />
    </PageShell>
  );
}
