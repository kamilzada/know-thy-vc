import { GoogleGenAI } from "@google/genai";
import { BriefError, requireEnv, toBriefError } from "./errors";

/** Gemini Flash only (assignment constraint). The alias always points at the newest Flash model. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY", "Gemini") });
  return client;
}

export type GroundedResult = {
  text: string;
  sources: { url: string; title: string }[];
};

/** Asks Gemini with the Google Search tool switched on and returns its answer plus the pages it used. */
export async function groundedSearch(prompt: string, signal?: AbortSignal): Promise<GroundedResult> {
  try {
    const res = await gemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2, abortSignal: signal },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources = chunks
      .map((c) => ({ url: c.web?.uri ?? "", title: c.web?.title ?? c.web?.domain ?? "" }))
      .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
    return { text: res.text ?? "", sources };
  } catch (err) {
    throw toBriefError(err, "Gemini");
  }
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
    let text: string;
    try {
      const res = await gemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: attempt === 0 ? opts.prompt : `${opts.prompt}\n\nYour previous reply was not valid JSON (${lastError}). Reply with JSON only.`,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
          temperature: 0.2,
          abortSignal: opts.signal,
        },
      });
      text = res.text ?? "";
    } catch (err) {
      throw toBriefError(err, "Gemini");
    }
    try {
      return JSON.parse(text) as T;
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
