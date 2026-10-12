import { Reveal } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SourceChip } from "@/components/ui/SourceChip";
import type { Brief } from "@/lib/types";
import { ConfidenceBadge } from "./BriefHeader";

function Pills({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={s} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ThesisSection({ brief }: { brief: Brief }) {
  const { thesis } = brief;
  const quote = thesis.quotes[0];
  return (
    <section aria-labelledby="thesis-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Thesis</SectionLabel>
        <ConfidenceBadge level={brief.confidence.thesis} />
      </div>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal>
          <h3 id="thesis-heading" className="font-display text-3xl md:text-4xl">
            What they back
          </h3>
          <p className="mt-4 text-lg leading-relaxed">{thesis.summary}</p>
          <div className="mt-6 space-y-4">
            <Pills label="Sectors" items={thesis.sectors} />
            <Pills label="Stages" items={thesis.stages} />
            {thesis.checkSize && <Pills label="Cheque size" items={[thesis.checkSize]} />}
          </div>
          {thesis.sourceUrls.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {thesis.sourceUrls.map((u) => (
                <SourceChip key={u} url={u} />
              ))}
            </div>
          )}
        </Reveal>

        {quote && (
          <Reveal delay={0.1}>
            <figure className="relative h-full overflow-hidden rounded-tl-[4rem] rounded-br-[4rem] rounded-tr-2xl rounded-bl-2xl border border-border bg-card p-8 pt-16 shadow-[var(--shadow-lg)]">
              <span aria-hidden className="absolute -top-4 left-6 font-display text-[120px] leading-none text-accent/10">
                &ldquo;
              </span>
              <span aria-hidden className="absolute left-0 top-10 h-16 w-1 rounded-r-full bg-signature" />
              <blockquote className="relative text-lg font-medium leading-relaxed">{quote.text}</blockquote>
              <figcaption className="mt-5">
                <SourceChip url={quote.sourceUrl} />
              </figcaption>
              {thesis.quotes.slice(1).map((q) => (
                <blockquote key={q.text} className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                  &ldquo;{q.text}&rdquo; <SourceChip url={q.sourceUrl} className="ml-1 align-middle" />
                </blockquote>
              ))}
            </figure>
          </Reveal>
        )}
      </div>
    </section>
  );
}
