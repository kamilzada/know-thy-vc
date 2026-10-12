"use client";

import { Button } from "@/components/ui/Button";
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
    <form
      noValidate
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
        <Button type="submit" size="lg" arrow disabled={busy} className="w-full shrink-0 sm:mt-7 sm:w-auto">
          {busy ? "Researching…" : "Know thy VC"}
        </Button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">Try:</span>
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
  );
}
