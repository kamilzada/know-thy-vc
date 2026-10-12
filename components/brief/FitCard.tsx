import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { FitScore } from "@/lib/fit";
import type { StartupProfile } from "@/lib/types";

/** The fit score, broken down. Computed in code from the verified brief, never by the model. */
export function FitCard({ fit, profile }: { fit: FitScore; profile: StartupProfile }) {
  return (
    <section aria-labelledby="fit-heading" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div>
        <SectionLabel>Fit for {profile.name}</SectionLabel>
        <h3 id="fit-heading" className="mt-4 font-display text-3xl md:text-4xl">
          {fit.label}: <span className="gradient-text">{fit.score}</span>
          <span className="text-muted-foreground">/100</span>
        </h3>
        <p className="mt-3 text-muted-foreground">
          Scored in code from the verified facts below, not by the AI, so the same brief always gets the same score.
        </p>
      </div>
      <Card className="p-6">
        <ul className="space-y-4">
          {fit.parts.map((p) => (
            <li key={p.label}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{p.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {p.points}/{p.max}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                <div className="h-full rounded-full bg-signature" style={{ width: `${(p.points / p.max) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.reason}</p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
