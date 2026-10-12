"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatShortDate, relativeDays } from "@/lib/format";
import type { BriefSummary } from "@/lib/supabase";

/** Card grid with a mono search box on top. */
export function HistoryGrid({ briefs }: { briefs: BriefSummary[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? briefs.filter((b) => `${b.investor_name} ${b.firm}`.toLowerCase().includes(q)) : briefs;

  if (briefs.length === 0) {
    return (
      <Card className="mt-10 border-dashed p-10 text-center">
        <p className="font-semibold">No briefs yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/" className="text-accent hover:underline">
            Research your first investor
          </Link>{" "}
          and it will show up here.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-10">
      <label className="relative block max-w-md">
        <span className="sr-only">Search briefs</span>
        <Search aria-hidden className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search investor or firm"
          className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
      </label>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((b) => (
          <li key={b.id}>
            <Link href={`/brief/${b.id}`} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              <Card className="flex h-full flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5">
                <p className="font-display text-2xl leading-tight">{b.investor_name}</p>
                <p className="mt-1 text-muted-foreground">{b.firm}</p>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <dl className="flex gap-5 font-mono text-xs text-muted-foreground">
                    <div>
                      <dt className="uppercase tracking-[0.15em]">Deals · 90d</dt>
                      <dd className="mt-1 text-base text-foreground">{b.deals}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[0.15em]">Sources</dt>
                      <dd className="mt-1 text-base text-foreground">{b.sources}</dd>
                    </div>
                  </dl>
                  <ArrowRight aria-hidden className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-4 font-mono text-[11px] text-muted-foreground" title={formatShortDate(b.created_at)}>
                  {relativeDays(b.created_at)}
                  {b.duration_ms ? ` · built in ${Math.round(b.duration_ms / 1000)}s` : ""}
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No briefs match &ldquo;{query}&rdquo;.</p>}
    </div>
  );
}
