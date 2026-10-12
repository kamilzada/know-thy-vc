import { toBriefError } from "./errors";

/**
 * Gemini Flash through OpenRouter's OpenAI-compatible API. Still Gemini Flash only; OpenRouter
 * just carries the request and does model fallback when one Flash model is overloaded.
 */
const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || "google/gemini-3.8-flash,google/gemini-3.6-flash,google/gemini-3.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export type ChatResult = {
  text: string;
  model: string;
  sources: { url: string; title: string; snippet: string }[];
};

type Annotation = { type: string; url_citation?: { url: string; title?: string; content?: string } };

export async function openRouterChat(opts: {
  system?: string;
  prompt: string;
  /** JSON schema for structured output. */
  schema?: object;
  /** Live web search (OpenRouter's web plugin; Exa for Gemini models). */
  web?: boolean;
  signal?: AbortSignal;
}): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://know-thy-vc.vercel.app",
        "X-Title": "Know Thy VC",
      },
      body: JSON.stringify({
        models: OPENROUTER_MODELS,
        messages: [...(opts.system ? [{ role: "system", content: opts.system }] : []), { role: "user", content: opts.prompt }],
        temperature: 0.2,
        ...(opts.schema
          ? { response_format: { type: "json_schema", json_schema: { name: "result", strict: false, schema: opts.schema } } }
          : {}),
        ...(opts.web ? { plugins: [{ id: "web", engine: "exa", max_results: 8 }] } : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw toBriefError(err, "Gemini (via OpenRouter)");
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    // An abort while the body is still streaming in is a timeout, not a bad response.
    throw toBriefError(opts.signal?.aborted ? Object.assign(new Error("aborted"), { name: "AbortError" }) : err, "Gemini (via OpenRouter)");
  }
  const body = raw as {
    model?: string;
    error?: { message?: string; code?: number };
    choices?: { message?: { content?: string; annotations?: Annotation[] } }[];
  } | null;

  if (!res.ok || body?.error || !body?.choices?.length) {
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    const status = body?.error?.code ?? res.status;
    const friendly = status === 402 ? "OpenRouter has no credit left on this key." : message;
    throw toBriefError(Object.assign(new Error(friendly), { status }), "Gemini (via OpenRouter)");
  }

  const message = body.choices[0].message ?? {};
  const seen = new Set<string>();
  const sources = (message.annotations ?? [])
    .filter((a) => a.type === "url_citation" && a.url_citation?.url)
    .map((a) => ({ url: a.url_citation!.url, title: a.url_citation!.title ?? "", snippet: (a.url_citation!.content ?? "").slice(0, 700) }))
    .filter((s) => !seen.has(s.url) && seen.add(s.url));

  return { text: message.content ?? "", model: body.model ?? OPENROUTER_MODELS[0], sources };
}
