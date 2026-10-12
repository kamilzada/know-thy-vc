import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { BriefError, requireEnv, toBriefError } from "./errors";

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

function shouldTryNextModel(err: unknown) {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  return (
    status === 503 || status === 404 || status === 429 ||
    /UNAVAILABLE|high demand|overloaded|no longer available|not found|RESOURCE_EXHAUSTED/i.test(message)
  );
}

async function generate(params: Omit<GenerateContentParameters, "model">): Promise<GenerateContentResponse> {
  let lastError: unknown;
  for (const model of MODEL_CHAIN) {
    if (params.config?.abortSignal?.aborted) break;
    try {
      return await gemini().models.generateContent({ ...params, model });
    } catch (err) {
      lastError = err;
      if (!shouldTryNextModel(err)) break;
      console.warn(`[Gemini] ${model} unavailable, trying the next Flash model`);
    }
  }
  throw toBriefError(lastError, "Gemini");
}

export type GroundedResult = {
  text: string;
  sources: { url: string; title: string }[];
};

/** Asks Gemini with the Google Search tool switched on and returns its answer plus the pages it used. */
export async function groundedSearch(prompt: string, signal?: AbortSignal): Promise<GroundedResult> {
  const res = await generate({
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2, abortSignal: signal },
  });
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources = chunks
    .map((c) => ({ url: c.web?.uri ?? "", title: c.web?.title ?? c.web?.domain ?? "" }))
    .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
  return { text: res.text ?? "", sources };
}

/** Calls Gemini with a JSON schema. Retries once if the output doesn't parse, then gives up politely. */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  signal?: AbortSignal;
}): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await generate({
      contents: attempt === 0 ? opts.prompt : `${opts.prompt}\n\nYour previous reply was not valid JSON (${lastError}). Reply with JSON only.`,
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
