"use client";

import { Check, Copy, ExternalLink, Printer, RotateCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InvestorAvatar } from "./InvestorAvatar";
import { formatShortDate } from "@/lib/format";
import type { Brief, Confidence, StartupProfile } from "@/lib/types";

const SECTION_NAMES = { portfolio: "Portfolio", thesis: "Thesis", context: "Context" } as const;

export function ConfidenceBadge({ level, label }: { level: Confidence; label?: string }) {
  return (
    <Badge variant={`confidence-${level}`}>
      {label ? `${label} · ` : ""}
      {level} confidence
    </Badge>
  );
}

export function BriefHeader({
  brief,
  cached,
  profile,
  onCopy,
  onRegenerate,
}: {
  brief: Brief;
  cached: boolean;
  profile: StartupProfile;
  onCopy: () => Promise<void>;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { investor } = brief;
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-5 md:gap-6">
      <InvestorAvatar name={investor.name} firm={investor.firm} firmUrl={investor.firmUrl} />
      <div className="min-w-0">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Prepared for {profile.name} · {profile.stage}
        </p>
        <h2 className="font-display text-4xl leading-[1.1] md:text-5xl">{investor.name}</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          {[investor.role, investor.firm].filter(Boolean).join(", ")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {investor.firmUrl && (
            <a href={investor.firmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              Firm page <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          )}
          {investor.linkedinUrl && (
            <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              LinkedIn <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            Generated {formatShortDate(brief.generatedAt)}
            {cached ? " · from cache (under 24h old)" : ""}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(SECTION_NAMES) as (keyof typeof SECTION_NAMES)[]).map((k) => (
            <ConfidenceBadge key={k} level={brief.confidence[k]} label={SECTION_NAMES[k]} />
          ))}
        </div>
      </div>
      </div>
      <div className="no-print flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden className="h-4 w-4" /> Download PDF
        </Button>
        {onRegenerate && (
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            <RotateCw aria-hidden className="h-4 w-4" /> Regenerate
          </Button>
        )}
      </div>
    </header>
  );
}
