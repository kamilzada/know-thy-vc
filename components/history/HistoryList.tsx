import { connection } from "next/server";
import { isSupabaseConfigured, listBriefs } from "@/lib/supabase";
import { HistoryGrid } from "./HistoryGrid";

/** Reads saved briefs at request time (inside the page's Suspense boundary). */
export async function HistoryList() {
  await connection();
  if (!isSupabaseConfigured()) {
    return <p className="mt-10 text-muted-foreground">History needs Supabase, which isn&apos;t configured on this deployment.</p>;
  }
  const briefs = await listBriefs();
  return <HistoryGrid briefs={briefs} />;
}
