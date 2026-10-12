import { BriefError } from "../errors";
import { extractJsonObject, generateJson, groundedSearch } from "../gemini";
import { tavilySearch } from "../tavily";
import type { Entity, SourceRef } from "../types";

type ResolverJson = {
  found?: boolean;
  fullName?: string;
  firm?: string;
  role?: string;
  firmUrl?: string;
  linkedinUrl?: string;
  ambiguity?: string;
  suggestions?: string[];
};

const RULES = (investor: string, firm: string) => `Rules:
- Use "${firm}" to pick the right person if several people share the name.
- If you find several plausible people even at this firm, describe the ambiguity in one sentence.
- If you cannot confirm the person at this firm, set found=false and list up to 3 suggestions in the form "Name at Firm" (e.g. the closest-matching partner at ${firm}, or the firm where "${investor}" actually works).
- Never invent URLs. Leave a field empty if you are not sure.`;

/**
 * Step 2: confirm the person exists at that firm. Gemini with Google Search grounding first;
 * if grounding is unavailable (quota, outage), Tavily results judged by Gemini instead.
 * The firm is the tie-breaker when the name is common (edge case 3).
 */
export async function resolveEntity(investor: string, firm: string, signal?: AbortSignal): Promise<Entity> {
  try {
    return await resolveWithGrounding(investor, firm, signal);
  } catch (err) {
    if (!process.env.TAVILY_API_KEY || !(err instanceof BriefError) || err.code === "missing_config") throw err;
    console.warn("[resolver] grounding unavailable, falling back to Tavily:", err.message);
    return resolveWithTavily(investor, firm, signal);
  }
}

async function resolveWithGrounding(investor: string, firm: string, signal?: AbortSignal): Promise<Entity> {
  const prompt = `You are verifying an investor's identity before a fundraising meeting.
Search the web and determine whether a person named "${investor}" currently works (or recently worked) at the investment firm "${firm}".

${RULES(investor, firm)}

Reply with ONLY a JSON object in a \`\`\`json block with these keys:
{"found": boolean, "fullName": string, "firm": string, "role": string, "firmUrl": string, "linkedinUrl": string, "ambiguity": string, "suggestions": string[]}`;

  const { text, sources } = await groundedSearch(prompt, signal);
  return toEntity(
    extractJsonObject<ResolverJson>(text) ?? {},
    investor,
    firm,
    sources.slice(0, 5).map((s, i) => ({ id: `R${i + 1}`, url: s.url, title: s.title, snippet: s.snippet ?? "", section: "resolver" as const })),
  );
}

const RESOLVER_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    fullName: { type: "string" },
    firm: { type: "string" },
    role: { type: "string" },
    firmUrl: { type: "string" },
    linkedinUrl: { type: "string" },
    ambiguity: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["found", "fullName", "firm", "suggestions"],
};

async function resolveWithTavily(investor: string, firm: string, signal?: AbortSignal): Promise<Entity> {
  const results = await tavilySearch(`"${investor}" ${firm} investor partner`, { maxResults: 8, signal });
  const sources: SourceRef[] = results.map((r, i) => ({
    id: `R${i + 1}`,
    url: r.url,
    title: r.title,
    snippet: r.content.slice(0, 500),
    section: "resolver",
  }));
  const json = await generateJson<ResolverJson>({
    system: "You verify investor identities using only the search results given. Do not use outside knowledge.",
    prompt: `Does a person named "${investor}" currently work (or recently work) at the investment firm "${firm}"?

${RULES(investor, firm)}
- firmUrl and linkedinUrl must be copied exactly from a result URL below, or left empty.

SEARCH RESULTS:
${sources.map((s) => `[${s.id}] ${s.title}\n${s.url}\n${s.snippet}`).join("\n\n") || "(none)"}`,
    schema: RESOLVER_SCHEMA,
    signal,
  });
  // Only keep URLs that really came back from the search.
  const known = new Set(sources.map((s) => s.url));
  if (json.firmUrl && !known.has(json.firmUrl)) json.firmUrl = undefined;
  if (json.linkedinUrl && !known.has(json.linkedinUrl)) json.linkedinUrl = undefined;
  return toEntity(json, investor, firm, sources.slice(0, 5));
}

function toEntity(json: ResolverJson, investor: string, firm: string, sources: SourceRef[]): Entity {
  return {
    found: json.found === true,
    fullName: clean(json.fullName) || investor,
    firm: clean(json.firm) || firm,
    role: clean(json.role),
    firmUrl: httpUrl(json.firmUrl),
    linkedinUrl: httpUrl(json.linkedinUrl),
    disambiguation: clean(json.ambiguity),
    suggestions: (json.suggestions ?? []).map(clean).filter((s): s is string => !!s).slice(0, 3),
    sources,
  };
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v && !/^(n\/?a|none|unknown|null)$/i.test(v) ? v : undefined;
}

function httpUrl(value: unknown): string | undefined {
  const v = clean(value);
  return v && /^https?:\/\//i.test(v) ? v : undefined;
}
