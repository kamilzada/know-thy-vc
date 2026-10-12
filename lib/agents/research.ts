import { withTimeout } from "../errors";
import { groundedSearch } from "../gemini";
import { tavilySearch, type TavilyResult } from "../tavily";
import type { Entity, Section, SourceRef } from "../types";

/** Each agent gets this long before its section is marked low confidence (plan §8). */
export const AGENT_TIMEOUT_MS = 15_000;
export const RECENT_DAYS = 90;

export type AgentResult = {
  agent: Section | "overview";
  ok: boolean;
  error?: string;
  sources: Omit<SourceRef, "id">[];
  /** Free-text summary, only from the grounded overview. */
  summary?: string;
};

/** Total Tavily queries per brief stays at 7, under the ~8 cap in plan §8. */
function queries(e: Entity): Record<Section, { q: string; topic: "news" | "general"; sinceDays?: number }[]> {
  const name = `"${e.fullName}"`;
  const firm = `"${e.firm}"`;
  return {
    portfolio: [
      { q: `${firm} leads funding round investment`, topic: "news", sinceDays: RECENT_DAYS },
      { q: `${name} ${firm} invests startup`, topic: "news", sinceDays: RECENT_DAYS },
      { q: `${firm} portfolio company acquired exit IPO`, topic: "news", sinceDays: 365 },
    ],
    thesis: [
      { q: `${name} ${firm} investment thesis interview`, topic: "general" },
      { q: `${name} podcast OR LinkedIn post on what they look for in founders`, topic: "general" },
    ],
    context: [
      { q: `${firm} controversy OR lawsuit OR layoffs OR "shut down" portfolio`, topic: "general", sinceDays: 365 },
      { q: `${firm} new fund OR fund close OR partner leaves ${name}`, topic: "news", sinceDays: 365 },
    ],
  };
}

function toSource(r: TavilyResult, section: Section): Omit<SourceRef, "id"> {
  return {
    url: r.url,
    title: r.title,
    date: r.published_date ? normaliseDate(r.published_date) : undefined,
    snippet: r.content.slice(0, 700),
    section,
  };
}

async function tavilyAgent(section: Section, entity: Entity): Promise<AgentResult> {
  try {
    const batches = await withTimeout(AGENT_TIMEOUT_MS, (signal) =>
      Promise.allSettled(
        queries(entity)[section].map(({ q, topic, sinceDays }) =>
          tavilySearch(q, { topic, sinceDays, maxResults: 5, signal }),
        ),
      ),
    );
    const results = batches.flatMap((b) => (b.status === "fulfilled" ? b.value : []));
    const failures = batches.filter((b): b is PromiseRejectedResult => b.status === "rejected");
    if (results.length === 0 && failures.length) {
      return { agent: section, ok: false, error: reason(failures[0].reason), sources: [] };
    }
    return { agent: section, ok: true, sources: results.map((r) => toSource(r, section)) };
  } catch (err) {
    return { agent: section, ok: false, error: reason(err), sources: [] };
  }
}

async function overviewAgent(entity: Entity): Promise<AgentResult> {
  try {
    const { text, sources } = await withTimeout(AGENT_TIMEOUT_MS, (signal) =>
      groundedSearch(
        `Give a factual briefing on ${entity.fullName}${entity.role ? `, ${entity.role}` : ""} at ${entity.firm}:
1) investments or exits they or ${entity.firm} announced in the last ${RECENT_DAYS} days (company, round, amount, date);
2) their stated investment thesis (sectors, stage, check size) with any direct quotes;
3) any controversies, portfolio shutdowns, sector pull-backs or fund news.
Today is ${new Date().toISOString().slice(0, 10)}. Include dates. Say "not found" for anything you can't find. Be concise.`,
        signal,
      ),
    );
    return {
      agent: "overview",
      ok: true,
      summary: text,
      sources: sources.map((s) => ({ url: s.url, title: s.title, snippet: "", section: "overview" as const })),
    };
  } catch (err) {
    return { agent: "overview", ok: false, error: reason(err), sources: [] };
  }
}

/** Step 3: three Tavily agents and one grounded overview, all at once. A failure never sinks the others. */
export function runResearch(entity: Entity) {
  return {
    portfolio: tavilyAgent("portfolio", entity),
    thesis: tavilyAgent("thesis", entity),
    context: tavilyAgent("context", entity),
    overview: overviewAgent(entity),
  };
}

/** Dedupes by URL across agents and numbers them S1…Sn so the model can cite them. */
export function numberSources(results: AgentResult[], resolver: SourceRef[] = []): SourceRef[] {
  const seen = new Set<string>(resolver.map((s) => canonicalUrl(s.url)));
  const out: SourceRef[] = [...resolver];
  let n = 0;
  for (const r of results) {
    for (const s of r.sources) {
      const key = canonicalUrl(s.url);
      if (!s.url || seen.has(key)) continue;
      seen.add(key);
      out.push({ ...s, id: `S${++n}` });
    }
  }
  return out;
}

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const p of [...u.searchParams.keys()]) if (p.startsWith("utm_")) u.searchParams.delete(p);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function normaliseDate(raw: string): string | undefined {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function reason(err: unknown): string {
  if (err instanceof Error) return err.name === "AbortError" ? "timed out" : err.message;
  return String(err);
}
