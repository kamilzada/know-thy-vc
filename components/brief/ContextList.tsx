import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Badge, SEVERITY_LABEL } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SourceChip } from "@/components/ui/SourceChip";
import type { Brief } from "@/lib/types";
import { ConfidenceBadge } from "./BriefHeader";

/** Red flags first (the validator already sorts them). */
export function ContextList({ brief }: { brief: Brief }) {
  return (
    <section aria-labelledby="context-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Context</SectionLabel>
        <ConfidenceBadge level={brief.confidence.context} />
      </div>
      <h3 id="context-heading" className="mt-4 font-display text-3xl md:text-4xl">
        Context and red flags
      </h3>
      {brief.context.length ? (
        <Stagger as="ul" className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
          {brief.context.map((c) => (
            <StaggerItem as="li" key={c.point} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <Badge variant={c.severity} className="w-fit shrink-0 sm:mt-0.5">
                {SEVERITY_LABEL[c.severity]}
              </Badge>
              <p className="flex-1 text-[15px] leading-relaxed">{c.point}</p>
              <SourceChip url={c.sourceUrl} className="w-fit shrink-0" />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Card className="mt-6 border-dashed p-8 text-center">
          <p className="font-semibold">No controversies or red flags found in public sources.</p>
          <p className="mt-1 text-sm text-muted-foreground">Absence of news isn&apos;t proof. Ask about fund status and recent exits.</p>
        </Card>
      )}
    </section>
  );
}
