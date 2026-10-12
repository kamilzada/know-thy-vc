import { extractJsonObject, groundedSearch } from "../gemini";
import type { Entity } from "../types";

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

/**
 * Step 2: confirm the person exists at that firm, using Gemini with Google Search grounding.
 * The firm is the tie-breaker when the name is common (edge case 3).
 */
export async function resolveEntity(investor: string, firm: string, signal?: AbortSignal): Promise<Entity> {
  const prompt = `You are verifying an investor's identity before a fundraising meeting.
Search the web and determine whether a person named "${investor}" currently works (or recently worked) at the investment firm "${firm}".

Rules:
- Use "${firm}" to pick the right person if several people share the name.
- If you find several plausible people even at this firm, describe the ambiguity in one sentence.
- If you cannot confirm the person at this firm, set found=false and list up to 3 suggestions in the form "Name at Firm" (e.g. the closest-matching partner at ${firm}, or the firm where "${investor}" actually works).
- Never invent URLs. Leave a field empty if you are not sure.

Reply with ONLY a JSON object in a \`\`\`json block with these keys:
{"found": boolean, "fullName": string, "firm": string, "role": string, "firmUrl": string, "linkedinUrl": string, "ambiguity": string, "suggestions": string[]}`;

  const { text, sources } = await groundedSearch(prompt, signal);
  const json = extractJsonObject<ResolverJson>(text) ?? {};

  return {
    found: json.found === true,
    fullName: clean(json.fullName) || investor,
    firm: clean(json.firm) || firm,
    role: clean(json.role),
    firmUrl: httpUrl(json.firmUrl),
    linkedinUrl: httpUrl(json.linkedinUrl),
    disambiguation: clean(json.ambiguity),
    suggestions: (json.suggestions ?? []).map(clean).filter((s): s is string => !!s).slice(0, 3),
    sources: sources.slice(0, 5).map((s, i) => ({
      id: `R${i + 1}`,
      url: s.url,
      title: s.title,
      snippet: "",
      section: "resolver" as const,
    })),
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
