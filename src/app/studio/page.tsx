import { Suspense } from "react";
import { PageShell } from "@/components/site-chrome";
import { StudioForm } from "@/components/studio-form";

export default function StudioPage() {
  return (
    <PageShell
      eyebrow="PUBLISH CORE"
      title="Одна мысль. Три платформы."
      kicker="Наследник daily-social-autopost: Instagram, Facebook Page, Threads — каждый со своим дыханием. API не кросс-постит. Мы пишем заново."
    >
      <Suspense fallback={<p className="text-white/40">Сборка студии…</p>}>
        <StudioForm />
      </Suspense>
    </PageShell>
  );
}
