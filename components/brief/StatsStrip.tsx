import type { FitScore } from "@/lib/fit";
import type { Brief } from "@/lib/types";

/** Inverted strip: Deals · 90d / Sources / Generated in / Fit score. */
export function StatsStrip({ brief, durationMs, fit }: { brief: Brief; durationMs: number; fit: FitScore }) {
  const stats = [
    { value: String(brief.portfolioActivity.length), label: "Deals · 90d" },
    { value: String(brief.sources.length), label: "Sources cited" },
    { value: durationMs ? `${Math.round(durationMs / 1000)}s` : "—", label: "Generated in" },
    { value: `${fit.score}`, label: `Fit score · ${fit.label}` },
  ];
  return (
    <section aria-label="Brief summary" className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-8 text-background md:px-10">
      <div aria-hidden className="dot-pattern absolute inset-0" />
      <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
      <dl className="relative grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-background/60">{s.label}</dt>
            <dd className="mt-2 font-display text-4xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
