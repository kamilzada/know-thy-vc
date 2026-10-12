import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryList } from "@/components/history/HistoryList";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const metadata: Metadata = { title: "History · Know Thy VC" };

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <SectionLabel>History</SectionLabel>
      <h1 className="mt-5 font-display text-4xl md:text-5xl">Past briefs</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Every brief is saved, so you can reopen it before a follow-up meeting without paying for a new one.</p>
      <Suspense fallback={<p className="mt-10 font-mono text-sm text-muted-foreground">Loading briefs…</p>}>
        <HistoryList />
      </Suspense>
    </div>
  );
}
