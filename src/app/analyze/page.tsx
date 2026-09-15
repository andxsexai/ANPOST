import { AnalyzeForm } from "@/components/analyze-form";
import { PageShell } from "@/components/site-chrome";

export default function AnalyzePage() {
  return (
    <PageShell
      eyebrow="VIDEO INTELLIGENCE"
      title="Сначала полный текст. Потом команда на пост."
      kicker="Забираем озвучку и тело источника целиком. Переработка — отдельная кнопка: Telegram до 1500 слов, Threads до 500, лёгкий смысл."
    >
      <AnalyzeForm />
    </PageShell>
  );
}
