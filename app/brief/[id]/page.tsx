import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefView } from "@/components/brief/BriefView";
import { getBrief, getProfile } from "@/lib/supabase";

export default function SavedBriefPage({ params }: PageProps<"/brief/[id]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-24 font-mono text-sm text-muted-foreground sm:px-6">Loading brief…</p>}>
      <SavedBrief params={params} />
    </Suspense>
  );
}

async function SavedBrief({ params }: { params: PageProps<"/brief/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const [saved, { profile }] = await Promise.all([getBrief(id), getProfile()]);
  if (!saved) notFound();
  return (
    <>
      <title>{`${saved.brief.investor.name} · Know Thy VC`}</title>
      <div className="no-print mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Link href="/history" className="font-mono text-xs text-muted-foreground hover:text-foreground">
          ← All briefs
        </Link>
      </div>
      <div className="pt-10">
        <BriefView brief={saved.brief} profile={profile} durationMs={saved.duration_ms ?? 0} cached={false} />
      </div>
    </>
  );
}
