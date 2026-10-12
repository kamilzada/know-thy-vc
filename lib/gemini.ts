import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { BriefError, requireEnv, toBriefError } from "./errors";
import { isOpenRouterConfigured, openRouterChat } from "./openrouter";

/** Gemini Flash only (assignment constraint). */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * If the preferred model is overloaded (503), retired (404) or out of per-model quota (429),
 * try the next Flash model. Every entry is a Flash model, so the constraint still holds.
 */
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview"];
const MODEL_CHAIN = [...new Set([GEMINI_MODEL, ...FALLBACK_MODELS])];

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY", "Gemini") });
  return client;
}

/**
 * Short-term memory of what's down, per warm server instance, so one brief's failures
 * don't make the next brief waste requests on the same dead ends.
 */
const modelCooldownUntil = new Map<string, number>();
let groundingBlockedUntil = 0;
const MODEL_COOLDOWN_MS = 60_000;
const RETIRED_COOLDOWN_MS = 60 * 60_000;
const GROUNDING_COOLDOWN_MS = 10 * 60_000;

function errorInfo(err: unknown) {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  return {
    retired: status === 404 || /no longer available|not found/i.test(message),
    busy: status === 503 || status === 429 || /UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED/i.test(message),
    quota: /exceeded your current quota/i.test(message),
  };
}

/** Models not cooling down, preferred first. If all are cooling, try the one that recovers soonest. */
function availableModels() {
  const now = Date.now();
  const ready = MODEL_CHAIN.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= now);
  if (ready.length) return ready;
  return [...MODEL_CHAIN].sort((a, b) => (modelCooldownUntil.get(a) ?? 0) - (modelCooldownUntil.get(b) ?? 0)).slice(0, 1);
}

async function generate(
  params: Omit<GenerateContentParameters, "model">,
  opts: { grounded?: boolean } = {},
): Promise<GenerateContentResponse> {
  let lastError: unknown;
  for (const model of availableModels()) {
    if (params.config?.abortSignal?.aborted) break;
    try {
      return await gemini().models.generateContent({ ...params, model });
    } catch (err) {
      lastError = err;
      const info = errorInfo(err);
      // A grounding quota error is project-wide, so other models won't help.
      if (opts.grounded && info.quota) {
        groundingBlockedUntil = Date.now() + GROUNDING_COOLDOWN_MS;
        break;
      }
      if (!info.retired && !info.busy) break;
      modelCooldownUntil.set(model, Date.now() + (info.retired ? RETIRED_COOLDOWN_MS : MODEL_COOLDOWN_MS));
      console.warn(`[Gemini] ${model} unavailable, trying the next Flash model`);
    }
  }
  throw toBriefError(lastError, "Gemini");
}

export type GroundedResult = {
  text: string;
  sources: { url: string; title: string; snippet?: string }[];
};

/** Which path Gemini Flash calls take: OpenRouter when its key is set, otherwise Google directly. */
export function geminiProvider() {
  return isOpenRouterConfigured() ? "openrouter" : "google";
}

/** Asks Gemini with the Google Search tool switched on and returns its answer plus the pages it used. */
export async function groundedSearch(prompt: string, signal?: AbortSignal): Promise<GroundedResult> {
  if (isOpenRouterConfigured()) {
    const { text, sources } = await openRouterChat({ prompt, web: true, signal });
    return { text, sources };
  }
  if (Date.now() < groundingBlockedUntil) {
    throw new BriefError("rate_limited", "Google Search grounding is unavailable on this Gemini key right now.");
  }
  const res = await generate(
    { contents: prompt, config: { tools: [{ googleSearch: {} }], temperature: 0.2, abortSignal: signal } },
    { grounded: true },
  );
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources = chunks
    .map((c) => ({ url: c.web?.uri ?? "", title: c.web?.title ?? c.web?.domain ?? "" }))
    .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
  return { text: res.text ?? "", sources };
}

/** Calls Gemini Flash with a JSON schema. Retries once if the output doesn't parse, then gives up politely. */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  signal?: AbortSignal;
}): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? opts.prompt : `${opts.prompt}\n\nYour previous reply was not valid JSON (${lastError}). Reply with JSON only.`;
    if (isOpenRouterConfigured()) {
      const { text } = await openRouterChat({ system: opts.system, prompt, schema: opts.schema, signal: opts.signal });
      try {
        return JSON.parse(stripFence(text)) as T;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "parse error";
        continue;
      }
    }
    const res = await generate({
      contents: prompt,
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
        temperature: 0.2,
        abortSignal: opts.signal,
      },
    });
    try {
      return JSON.parse(res.text ?? "") as T;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "parse error";
    }
  }
  throw new BriefError("bad_model_output", "Gemini returned a malformed brief twice in a row. Please try again.");
}

function stripFence(text: string) {
  return text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
}

/** Pulls the first JSON object out of free text (grounded calls can't use a response schema). */
export function extractJsonObject<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
