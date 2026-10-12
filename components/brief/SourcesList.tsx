import { ShieldCheck } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SourceChip } from "@/components/ui/SourceChip";
import type { Brief } from "@/lib/types";

const GROUP_LABEL: Record<Brief["sources"][number]["section"], string> = {
  portfolio: "Portfolio",
  thesis: "Thesis",
  context: "Context",
  overview: "Web overview",
  resolver: "Identity",
};

/** Every cited source grouped by section, plus how the brief was checked. */
export function SourcesList({ brief }: { brief: Brief }) {
  const groups = Object.entries(
    brief.sources.reduce<Record<string, Brief["sources"]>>((acc, s) => {
      (acc[s.section] ??= []).push(s);
      return acc;
    }, {}),
  );
  return (
    <section aria-labelledby="sources-heading" className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <SectionLabel>Sources</SectionLabel>
        <h3 id="sources-heading" className="mt-4 font-display text-3xl">
          {brief.sources.length} sources, every claim linked
        </h3>
        <div className="mt-6 space-y-5">
          {groups.map(([section, items]) => (
            <div key={section}>
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {GROUP_LABEL[section as keyof typeof GROUP_LABEL] ?? section}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {items.map((s) => (
                  <SourceChip key={s.url} url={s.url} date={s.date} title={s.title} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-muted/50 p-6">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden className="h-5 w-5 text-accent" /> How this brief was checked
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Every claim cites a page we actually fetched. Claims citing anything else are removed.</li>
          <li>Quotes are kept only if the words appear in the source text.</li>
          <li>Deals older than 90 days are moved to &ldquo;older activity&rdquo;.</li>
          <li>
            <span className="font-medium text-foreground">{brief.validation.droppedClaims}</span> unsupported claim
            {brief.validation.droppedClaims === 1 ? " was" : "s were"} removed from this brief.
          </li>
        </ul>
        {brief.notes.length > 0 && (
          <>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Caveats</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
              {brief.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-5 text-xs text-muted-foreground">
          LinkedIn can&apos;t be read directly; public posts only appear through search snippets. Verify key facts before the meeting.
        </p>
      </aside>
    </section>
  );
}
