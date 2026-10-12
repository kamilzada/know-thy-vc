"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { InputErrors } from "@/lib/input";

/** Investors we've checked return recent, well-sourced data. One click fills the form. */
export const STARTER_INVESTORS = [
  { investor: "Karthik Reddy", firm: "Blume Ventures" },
  { investor: "Kanwaljit Singh", firm: "Fireside Ventures" },
  { investor: "Rajan Anandan", firm: "Peak XV Partners" },
];

type Props = {
  investor: string;
  firm: string;
  errors: InputErrors;
  busy: boolean;
  onChange: (field: "investor" | "firm", value: string) => void;
  onSubmit: () => void;
  onPick: (investor: string, firm: string) => void;
};

export function BriefForm({ investor, firm, errors, busy, onChange, onSubmit, onPick }: Props) {
  return (
    <Card variant="featured" className="p-5 md:p-7">
      <form
        noValidate
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="mb-5 flex items-start gap-4">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Search className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl leading-tight md:text-3xl">Who are you meeting?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We research them live: deals in the last 90 days, thesis, red flags and three openers.
            </p>
          </div>
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Input
            name="investor"
            label="Investor name"
            placeholder="e.g. Karthik Reddy"
            autoComplete="off"
            value={investor}
            error={errors.investor}
            disabled={busy}
            onChange={(e) => onChange("investor", e.target.value)}
          />
          <Input
            name="firm"
            label="Firm"
            placeholder="e.g. Blume Ventures"
            autoComplete="off"
            value={firm}
            error={errors.firm}
            disabled={busy}
            onChange={(e) => onChange("firm", e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" arrow disabled={busy} className="mt-1 w-full text-base">
          {busy ? "Researching…" : "Know thy VC"}
        </Button>
        <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">About 40 seconds · every claim linked to its source</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="font-mono text-xs text-muted-foreground">Or try:</span>
          {STARTER_INVESTORS.map((s) => (
            <button
              key={s.investor}
              type="button"
              disabled={busy}
              onClick={() => onPick(s.investor, s.firm)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              {s.investor} · {s.firm}
            </button>
          ))}
        </div>
      </form>
    </Card>
  );
}
