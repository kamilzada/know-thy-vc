import "server-only";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_STARTUP_PROFILE, sanitizeProfile } from "./startupProfile";
import type { Brief, StartupProfile } from "./types";

const CACHE_HOURS = 24;

let client: SupabaseClient | null | undefined;

/**
 * Server-side client with the service role key. Returns null when Supabase isn't configured.
 * Accepts both our names and the ones the Vercel Supabase integration sets.
 */
function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function isSupabaseConfigured() {
  return db() !== null;
}

/** Talking points are tailored to the profile, so a cached brief only counts for the same profile. */
export function profileHash(profile: StartupProfile) {
  return createHash("sha256").update(JSON.stringify(profile)).digest("hex").slice(0, 16);
}

/** Step 1: same investor, firm (case-insensitive) and profile in the last 24h → reuse it. */
export async function findCachedBrief(investor: string, firm: string, profile: StartupProfile) {
  const supabase = db();
  if (!supabase) return null;
  const since = new Date(Date.now() - CACHE_HOURS * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("briefs")
    .select("id, brief, duration_ms, created_at")
    .eq("investor_key", key(investor))
    .eq("firm_key", key(firm))
    .eq("profile_hash", profileHash(profile))
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
export async function saveBrief(opts: { investor: string; firm: string; profile: StartupProfile; brief: Brief; durationMs: number }) {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("briefs")
    .insert({
      investor_name: opts.brief.investor.name,
      firm: opts.brief.investor.firm,
      investor_key: key(opts.investor),
      firm_key: key(opts.firm),
      profile_hash: profileHash(opts.profile),
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

export type BriefSummary = {
  id: string;
  investor_name: string;
  firm: string;
  created_at: string;
  duration_ms: number | null;
  deals: number;
  sources: number;
};

export async function listBriefs(limit = 60): Promise<BriefSummary[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("briefs")
    .select("id, investor_name, firm, created_at, duration_ms, brief")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] list failed", error.message);
    return [];
  }
  return (data as { id: string; investor_name: string; firm: string; created_at: string; duration_ms: number | null; brief: Brief }[]).map(
    ({ brief, ...row }) => ({ ...row, deals: brief.portfolioActivity?.length ?? 0, sources: brief.sources?.length ?? 0 }),
  );
}

export async function getBrief(id: string) {
  const supabase = db();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("briefs").select("id, brief, duration_ms, created_at").eq("id", id).maybeSingle();
  if (error) {
    console.error("[supabase] get failed", error.message);
    return null;
  }
  return data as { id: string; brief: Brief; duration_ms: number | null; created_at: string } | null;
}

type ProfileRow = { name: string; one_liner: string; sector: string; stage: string; raise_amount: string; traction: string; updated_at: string };

/** The workspace's startup profile, or the default if none has been saved yet. */
export async function getProfile(): Promise<{ profile: StartupProfile; saved: boolean; updatedAt?: string }> {
  const supabase = db();
  if (!supabase) return { profile: DEFAULT_STARTUP_PROFILE, saved: false };
  const { data, error } = await supabase.from("startup_profile").select("*").eq("id", "default").maybeSingle<ProfileRow>();
  if (error) console.error("[supabase] profile read failed", error.message);
  if (!data) return { profile: DEFAULT_STARTUP_PROFILE, saved: false };
  return {
    profile: sanitizeProfile({
      name: data.name,
      oneLiner: data.one_liner,
      sector: data.sector,
      stage: data.stage,
      raiseAmount: data.raise_amount,
      traction: data.traction,
    }),
    saved: true,
    updatedAt: data.updated_at,
  };
}

export async function saveProfile(profile: StartupProfile) {
  const supabase = db();
  if (!supabase) return false;
  const { error } = await supabase.from("startup_profile").upsert({
    id: "default",
    name: profile.name,
    one_liner: profile.oneLiner,
    sector: profile.sector,
    stage: profile.stage,
    raise_amount: profile.raiseAmount,
    traction: profile.traction,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[supabase] profile save failed", error.message);
    return false;
  }
  return true;
}

/** What the user typed, normalised: the cache key is the input, not the resolver's corrected name. */
function key(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
