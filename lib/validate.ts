import type { DraftBrief } from "./agents/synthesize";
import { RECENT_DAYS, type AgentResult } from "./agents/research";
import type { Brief, Confidence, Entity, PortfolioItem, Section, Severity, SourceRef } from "./types";

const SEVERITY_ORDER: Record<Severity, number> = { red_flag: 0, watch: 1, info: 2 };
const MAX_OLDER = 3;

/**
 * Step 6: deterministic checks on the model's draft. Nothing reaches the user unless it
 * cites a source we actually fetched. Recency, dedupe and confidence are decided here, in code.
 */
export function validateBrief(opts: {
  draft: DraftBrief;
  entity: Entity;
  sources: SourceRef[];
  agents: Record<Section | "overview", AgentResult>;
  now?: Date;
}): Brief {
  const { draft, entity, sources, agents } = opts;
  const now = opts.now ?? new Date();
  const byId = new Map(sources.map((s) => [s.id.toUpperCase(), s]));
  const overviewText = normalise(agents.overview.summary ?? "");
  const cited = new Map<string, SourceRef>();
  const dropped: string[] = [];

  const resolve = (id: unknown, what: string): SourceRef | null => {
    const src = typeof id === "string" ? byId.get(id.trim().replace(/^\[|\]$/g, "").toUpperCase()) : undefined;
    if (!src) {
      dropped.push(`${what}: cites unknown source "${String(id ?? "none")}"`);
      return null;
    }
    cited.set(src.id, src);
    return src;
  };

  // Portfolio: needs a real date. Within 90 days stays; older moves to "older activity".
  const cutoff = now.getTime() - RECENT_DAYS * 86_400_000;
  const recent: PortfolioItem[] = [];
  const older: PortfolioItem[] = [];
  const seenDeals = new Set<string>();
  for (const p of arr(draft.portfolioActivity)) {
    const label = `Deal "${p?.company ?? "?"}"`;
    if (!p?.company?.trim()) continue;
    const date = parseDate(p.date);
    if (!date) {
      dropped.push(`${label}: no usable date`);
      continue;
    }
    if (date.getTime() > now.getTime() + 86_400_000) {
      dropped.push(`${label}: date is in the future`);
      continue;
    }
    const key = `${p.company.trim().toLowerCase()}|${p.type}`;
    if (seenDeals.has(key)) continue;
    const src = resolve(p.sourceId, label);
    if (!src) continue;
    seenDeals.add(key);
    const item: PortfolioItem = {
      company: p.company.trim(),
      type: p.type === "exit" ? "exit" : "investment",
      round: blank(p.round),
      amount: blank(p.amount),
      date: date.toISOString().slice(0, 10),
      sourceUrl: src.url,
    };
    (date.getTime() >= cutoff ? recent : older).push(item);
  }
  const newestFirst = (a: PortfolioItem, b: PortfolioItem) => b.date.localeCompare(a.date);
  recent.sort(newestFirst);
  older.sort(newestFirst);

  // Thesis: quotes must actually appear in the text we fetched, not just cite a source.
  const thesisIds = arr(draft.thesis?.sourceIds)
    .map((id) => resolve(id, "Thesis summary"))
    .filter((s): s is SourceRef => !!s);
  const quotes = arr(draft.thesis?.quotes).flatMap((q) => {
    const src = resolve(q?.sourceId, "Quote");
    if (!src || !q.text?.trim()) return [];
    const needle = normalise(q.text).slice(0, 60);
    if (!normalise(src.snippet).includes(needle) && !overviewText.includes(needle)) {
      dropped.push(`Quote "${q.text.slice(0, 40)}…": not found verbatim in its source`);
      return [];
    }
    return [{ text: q.text.trim().replace(/^["“]|["”]$/g, ""), sourceUrl: src.url }];
  });
  const hasThesisEvidence = thesisIds.length > 0 || quotes.length > 0;
  if (!hasThesisEvidence && draft.thesis?.summary) dropped.push("Thesis summary: no valid citation");

  // Context: cited only, red flags first.
  const context = arr(draft.context)
    .flatMap((c) => {
      const src = resolve(c?.sourceId, `Context "${c?.point?.slice(0, 40) ?? "?"}"`);
      if (!src || !c.point?.trim()) return [];
      const severity: Severity = c.severity in SEVERITY_ORDER ? c.severity : "info";
      return [{ point: c.point.trim(), severity, sourceUrl: src.url }];
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Talking points: cited only, at most 3.
  const talkingPoints = arr(draft.talkingPoints)
    .flatMap((t) => {
      const src = resolve(t?.evidenceSourceId, `Talking point "${t?.opener?.slice(0, 40) ?? "?"}"`);
      if (!src || !t.opener?.trim()) return [];
      return [{ opener: t.opener.trim(), why: (t.why ?? "").trim(), evidenceUrl: src.url }];
    })
    .slice(0, 3);

  // Notes are model-written: swap internal IDs like "S14" for the source's site name.
  const notes = arr(draft.notes)
    .filter((n) => typeof n === "string" && n.trim())
    .map((n) =>
      n.replace(/\b(?:source\s+)?\[?([SR]\d+)\]?/gi, (match, id: string) => {
        const src = byId.get(id.toUpperCase());
        return src ? `the ${domain(src.url)} report` : match;
      }),
    );
  if (entity.disambiguation) notes.unshift(entity.disambiguation);
  if (recent.length === 0) notes.push(`No public deals found in the last ${RECENT_DAYS} days.`);
  if (talkingPoints.length < 3) {
    notes.push(`Only ${talkingPoints.length} of 3 talking points could be backed by a source, so the rest were left out.`);
  }
  for (const [name, a] of Object.entries(agents)) {
    if (a.ok) continue;
    notes.push(
      name === "overview"
        ? "Google Search overview was unavailable, so this brief is built from Tavily search results only."
        : `${cap(name)} search was unavailable (${shortReason(a.error)}), so that section has less data.`,
    );
  }

  const confidence: Record<Section, Confidence> = {
    portfolio: !agents.portfolio.ok && !agents.overview.ok ? "low" : grade(new Set(recent.map((r) => r.sourceUrl)).size, 2, 1),
    thesis: !hasThesisEvidence ? "low" : quotes.length > 0 && thesisIds.length >= 2 ? "high" : "medium",
    context: !agents.context.ok ? "low" : context.length === 0 ? "medium" : grade(context.length, 2, 1),
  };

  return {
    investor: {
      name: entity.fullName,
      firm: entity.firm,
      role: entity.role,
      firmUrl: entity.firmUrl,
      linkedinUrl: entity.linkedinUrl,
    },
    generatedAt: now.toISOString(),
    portfolioActivity: recent,
    olderActivity: older.slice(0, MAX_OLDER),
    thesis: {
      summary: hasThesisEvidence
        ? (draft.thesis?.summary ?? "").trim()
        : "Not enough public material was found to describe this investor's thesis with confidence.",
      sectors: hasThesisEvidence ? strings(draft.thesis?.sectors) : [],
      stages: hasThesisEvidence ? strings(draft.thesis?.stages) : [],
      // A cheque size needs a number in it; "seed to Series A" is a stage, not a size.
      checkSize: hasThesisEvidence && /\d/.test(draft.thesis?.checkSize ?? "") ? blank(draft.thesis?.checkSize) : undefined,
      quotes,
      sourceUrls: thesisIds.map((s) => s.url),
    },
    context,
    talkingPoints,
    confidence,
    sources: [...cited.values()].map((s) => ({ url: s.url, title: s.title, date: s.date, section: s.section })),
    notes: [...new Set(notes)],
    validation: { droppedClaims: dropped.length, droppedReasons: dropped },
  };
}

function grade(n: number, high: number, medium: number): Confidence {
  return n >= high ? "high" : n >= medium ? "medium" : "low";
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[“”"‘’'`]/g, "").replace(/\s+/g, " ").trim();
}

function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return arr(value as string[]).filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, 8);
}

function blank(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./, "");
  } catch {
    return "source";
  }
}

function shortReason(error?: string) {
  if (!error) return "unknown error";
  if (/timed out|took too long/i.test(error)) return "timed out";
  if (/quota|rate limit/i.test(error)) return "rate limited";
  if (/isn't configured|rejected the API key/i.test(error)) return "not configured";
  return "service error";
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
