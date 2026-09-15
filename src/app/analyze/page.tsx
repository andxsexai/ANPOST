import { AnalyzeForm } from "@/components/analyze-form";
import { PageShell } from "@/components/site-chrome";

export default function AnalyzePage() {
  return (
    <PageShell
      eyebrow="VIDEO INTELLIGENCE"
      title="Ссылка → смысл → свой текст."
      kicker="YouTube отдаёт публичные субтитры. TikTok, VK и Instagram — открытые метаданные и oEmbed. Мы не взламываем плеер: мы читаем то, что уже лежит на поверхности, и собираем из этого сценарий."
    >
      <AnalyzeForm />
    </PageShell>
  );
}
