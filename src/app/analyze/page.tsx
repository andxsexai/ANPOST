import { AnalyzeForm } from "@/components/analyze-form";
import { PageShell } from "@/components/site-chrome";

export default function AnalyzePage() {
  return (
    <PageShell
      eyebrow="VIDEO INTELLIGENCE"
      title="Сначала полный текст. Потом команда на пост."
      kicker="По любой публичной ссылке снимаем озвучку или тело поста и сразу собираем Telegram / Threads. Смысл источника не подменяем."
    >
      <AnalyzeForm />
    </PageShell>
  );
}
