import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SourceChip } from "@/components/ui/SourceChip";
import { cn } from "@/lib/cn";
import { formatShortDate, relativeDays } from "@/lib/format";
import type { Brief, PortfolioItem } from "@/lib/types";
import { ConfidenceBadge } from "./BriefHeader";

function DealCard({ deal, wide }: { deal: PortfolioItem; wide?: boolean }) {
  return (
    <Card className={cn("flex h-full flex-col p-6", wide && "md:p-8")}>
      <div className="flex items-start justify-between gap-3">
        <h4 className={cn("font-semibold", wide ? "text-2xl" : "text-lg")}>{deal.company}</h4>
        {deal.type === "exit" && <Badge variant="info">Exit</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{[deal.round, deal.amount].filter(Boolean).join(" · ") || "Round not disclosed"}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        <span className="font-mono text-xs text-muted-foreground" title={formatShortDate(deal.date)}>
          {relativeDays(deal.date)}
        </span>
        <SourceChip url={deal.sourceUrl} date={deal.date} />
      </div>
    </Card>
  );
}

export function PortfolioGrid({ brief }: { brief: Brief }) {
  const recent = brief.portfolioActivity;
  return (
    <section aria-labelledby="portfolio-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Portfolio · last 90 days</SectionLabel>
        <ConfidenceBadge level={brief.confidence.portfolio} />
      </div>
      <h3 id="portfolio-heading" className="mt-4 font-display text-3xl md:text-4xl">
        Recent activity
      </h3>

      {recent.length ? (
        <Stagger className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recent.map((deal, i) => (
            <StaggerItem key={`${deal.company}-${deal.date}`} className={cn(i === 0 && "md:col-span-2")}>
              <DealCard deal={deal} wide={i === 0} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Card className="mt-6 border-dashed p-8 text-center">
          <p className="font-semibold">No public deals found in the last 90 days.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            That can mean a quiet period or deals that weren&apos;t announced. Worth asking what they&apos;re looking at now.
          </p>
        </Card>
      )}

      {brief.olderActivity.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Older activity (over 90 days)</p>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {brief.olderActivity.map((deal) => (
              <li key={`${deal.company}-${deal.date}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm">
                  <span className="font-medium">{deal.company}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {deal.type === "exit" ? "exit" : [deal.round, deal.amount].filter(Boolean).join(" · ") || "investment"}
                  </span>
                </span>
                <SourceChip url={deal.sourceUrl} date={deal.date} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
