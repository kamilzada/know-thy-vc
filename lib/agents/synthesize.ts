import { generateJson } from "../gemini";
import type { Entity, Severity, SourceRef, StartupProfile } from "../types";
import { RECENT_DAYS } from "./research";

/** What Gemini returns. Claims cite source IDs (S1…), never raw URLs, so it can't invent links. */
export type DraftBrief = {
  portfolioActivity: {
    company: string;
    type: "investment" | "exit";
    round?: string;
    amount?: string;
    date: string;
    sourceId: string;
  }[];
  thesis: {
    summary: string;
    sectors: string[];
    stages: string[];
    checkSize?: string;
    quotes: { text: string; sourceId: string }[];
    sourceIds: string[];
  };
  context: { point: string; severity: Severity; sourceId: string }[];
  talkingPoints: { opener: string; why: string; evidenceSourceId: string }[];
  notes: string[];
};

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;

const SCHEMA = {
  type: "object",
  properties: {
    portfolioActivity: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: str,
          type: { type: "string", enum: ["investment", "exit"] },
          round: { type: "string", description: "e.g. Seed, Series A, acquisition" },
          amount: { type: "string", description: "with currency, e.g. ₹40 crore or $5M" },
          date: { type: "string", description: "YYYY-MM-DD announcement date taken from the source" },
          sourceId: str,
        },
        required: ["company", "type", "date", "sourceId"],
      },
    },
    thesis: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 plain sentences" },
        sectors: strArr,
        stages: strArr,
        checkSize: { type: "string", description: "typical cheque size as an amount or range, e.g. $1-3M. Omit if not stated." },
        quotes: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string", description: "verbatim words from the source" }, sourceId: str },
            required: ["text", "sourceId"],
          },
        },
        sourceIds: strArr,
      },
      required: ["summary", "sectors", "stages", "quotes", "sourceIds"],
    },
    context: {
      type: "array",
      items: {
        type: "object",
        properties: {
          point: str,
          severity: { type: "string", enum: ["info", "watch", "red_flag"] },
          sourceId: str,
        },
        required: ["point", "severity", "sourceId"],
      },
    },
    talkingPoints: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          opener: { type: "string", description: "one sentence the founder can say out loud" },
          why: { type: "string", description: "why this lands with this investor, tied to the startup" },
          evidenceSourceId: str,
        },
        required: ["opener", "why", "evidenceSourceId"],
      },
    },
    notes: { ...strArr, description: "caveats, e.g. name ambiguity or thin data" },
  },
  required: ["portfolioActivity", "thesis", "context", "talkingPoints", "notes"],
};

const systemPrompt = (firm: string) => `You are an analyst preparing a founder for an investor meeting. You write a structured brief using ONLY the numbered sources you are given.

Hard rules:
- Every claim must cite exactly one source ID from the list (e.g. "S4"). Never cite an ID that isn't listed. Never write URLs.
- If a fact isn't in the sources, leave it out. An empty list is better than a guess.
- portfolioActivity: only deals where ${firm} or the investor invested or exited. Use the deal's announcement date from the source as YYYY-MM-DD. Include older deals too if they're all you have; the app labels them by date.
- quotes: copy words verbatim from a source snippet or the grounded overview. No paraphrased quotes.
- context severity: "red_flag" for controversies, lawsuits, portfolio shutdowns, partner departures or a pulled-back sector relevant to the founder; "watch" for things worth probing; "info" for neutral context like a new fund.
- talkingPoints: exactly 3. Each must connect a specific, cited fact about the investor to the founder's startup (stage, sector, traction). No generic flattery.
- Plain, factual tone. No hype.`;

export async function synthesize(opts: {
  entity: Entity;
  sources: SourceRef[];
  overview?: string;
  profile: StartupProfile;
  signal?: AbortSignal;
}): Promise<DraftBrief> {
  const { entity, sources, overview, profile } = opts;
  const today = new Date().toISOString().slice(0, 10);

  const sourceList = sources
    .map((s) => `[${s.id}] (${s.section}${s.date ? `, ${s.date}` : ""}) ${s.title}\n${s.snippet || "(no snippet: grounded web page, see overview)"}`)
    .join("\n\n");
  const overviewIds = sources.filter((s) => s.section === "overview").map((s) => s.id);

  const prompt = `Today: ${today}. "Recent" means on or after ${daysAgo(RECENT_DAYS)}.

INVESTOR: ${entity.fullName}${entity.role ? `, ${entity.role}` : ""} at ${entity.firm}
${entity.disambiguation ? `Identity note: ${entity.disambiguation}\n` : ""}
FOUNDER'S STARTUP: ${profile.name}: ${profile.oneLiner}
Sector: ${profile.sector} · Stage: ${profile.stage} · Raising: ${profile.raiseAmount} · Traction: ${profile.traction}

WEB OVERVIEW (live web search; cite its facts with one of ${overviewIds.join(", ") || "no IDs: do not use it"}):
${overview?.trim() || "(not available for this brief; do not mention it in notes)"}

SOURCES:
${sourceList || "(none)"}

Write the brief JSON.`;

  return generateJson<DraftBrief>({
    system: systemPrompt(entity.firm),
    prompt,
    schema: SCHEMA,
    signal: opts.signal,
  });
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}
