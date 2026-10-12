import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Brief } from "./types";

const CACHE_HOURS = 24;

let client: SupabaseClient | null | undefined;

/** Server-side client with the service role key. Returns null when Supabase isn't configured. */
function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function isSupabaseConfigured() {
  return db() !== null;
}

/** Step 1: same investor and firm (case-insensitive) briefed in the last 24h → reuse it. */
export async function findCachedBrief(investor: string, firm: string) {
  const supabase = db();
  if (!supabase) return null;
  const since = new Date(Date.now() - CACHE_HOURS * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("briefs")
    .select("id, brief, duration_ms, created_at")
    .eq("investor_key", key(investor))
    .eq("firm_key", key(firm))
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[supabase] cache lookup failed", error.message);
    return null;
  }
  return data as { id: string; brief: Brief; duration_ms: number; created_at: string } | null;
}

/** Step 7: persist the brief. Failures are logged, never shown; the user already has their brief. */
export async function saveBrief(opts: { investor: string; firm: string; brief: Brief; durationMs: number }) {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("briefs")
    .insert({
      investor_name: opts.brief.investor.name,
      firm: opts.brief.investor.firm,
      investor_key: key(opts.investor),
      firm_key: key(opts.firm),
      brief: opts.brief,
      duration_ms: opts.durationMs,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[supabase] save failed", error.message);
    return null;
  }
  return data.id as string;
}

export async function listBriefs(limit = 50) {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("briefs")
    .select("id, investor_name, firm, created_at, duration_ms, brief->portfolioActivity")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] list failed", error.message);
    return [];
  }
  return data;
}

/** What the user typed, normalised: the cache key is the input, not the resolver's corrected name. */
function key(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
