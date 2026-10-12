import { ExternalLink } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { domainOf } from "@/components/ui/SourceChip";
import { cn } from "@/lib/cn";
import type { Brief } from "@/lib/types";

/** The emotional peak: three openers, the middle one featured and offset. */
export function TalkingPoints({ brief }: { brief: Brief }) {
  return (
    <section aria-labelledby="talking-heading" className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-12 text-background md:px-10 md:pb-20">
      <div aria-hidden className="dot-pattern absolute inset-0" />
      <div aria-hidden className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative">
        <SectionLabel inverted>Open with</SectionLabel>
        <h3 id="talking-heading" className="mt-4 font-display text-3xl md:text-4xl">
          Three things to <span className="gradient-text">say</span>
        </h3>
        {brief.talkingPoints.length === 0 ? (
          <p className="mt-6 text-background/70">No talking point could be backed by a source for this investor.</p>
        ) : (
          <Stagger as="ol" className="mt-8 grid gap-5 md:grid-cols-3">
            {brief.talkingPoints.map((t, i) => (
              <StaggerItem as="li" key={t.opener} className={cn(i === 1 && "md:translate-y-8")}>
                <Card variant={i === 1 ? "featured" : "default"} className="flex h-full flex-col border-0 p-6 text-foreground">
                  <span aria-hidden className="font-display text-5xl text-accent/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 text-lg font-semibold leading-snug">{t.opener}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.why}</p>
                  <a
                    href={t.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 pt-5 font-mono text-xs text-accent hover:underline"
                  >
                    Evidence: {domainOf(t.evidenceUrl)} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
