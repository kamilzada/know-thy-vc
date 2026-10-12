"use client";

import { forwardRef, useMemo } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { computeFit } from "@/lib/fit";
import { briefToMarkdown } from "@/lib/markdown";
import type { Brief, StartupProfile } from "@/lib/types";
import { BriefHeader } from "./BriefHeader";
import { ContextList } from "./ContextList";
import { FitCard } from "./FitCard";
import { PortfolioGrid } from "./PortfolioGrid";
import { SourcesList } from "./SourcesList";
import { StatsStrip } from "./StatsStrip";
import { TalkingPoints } from "./TalkingPoints";
import { ThesisSection } from "./ThesisSection";

type Props = {
  brief: Brief;
  profile: StartupProfile;
  durationMs: number;
  cached: boolean;
  onRegenerate?: () => void;
};

/** The full brief, used on the home page after a run and on saved-brief pages. */
export const BriefView = forwardRef<HTMLDivElement, Props>(function BriefView({ brief, profile, durationMs, cached, onRegenerate }, ref) {
  const fit = useMemo(() => computeFit(brief, profile), [brief, profile]);
  return (
    <div ref={ref} className="mx-auto max-w-6xl scroll-mt-24 space-y-20 px-4 pb-24 sm:px-6 md:space-y-28">
      <div className="hidden print:block">
        <p className="font-display text-lg">
          Know Thy <span className="text-accent">VC</span>
        </p>
        <p className="font-mono text-xs">Generated {new Date(brief.generatedAt).toLocaleString("en-IN")}</p>
      </div>
      <Reveal>
        <BriefHeader
          brief={brief}
          cached={cached}
          profile={profile}
          onCopy={() => navigator.clipboard.writeText(briefToMarkdown(brief, fit))}
          onRegenerate={onRegenerate}
        />
      </Reveal>
      <Reveal>
        <StatsStrip brief={brief} durationMs={durationMs} fit={fit} />
      </Reveal>
      <PortfolioGrid brief={brief} />
      <ThesisSection brief={brief} />
      <ContextList brief={brief} />
      <TalkingPoints brief={brief} profile={profile} />
      <FitCard fit={fit} profile={profile} />
      <SourcesList brief={brief} />
    </div>
  );
});
