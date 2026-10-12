import { GEMINI_MODEL, generateJson, geminiProvider, groundedSearch } from "@/lib/gemini";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Reports which services are configured. With ?probe=1 it also makes two tiny Gemini Flash calls. */
export async function GET(request: Request) {
  const provider = geminiProvider();
  const config = {
    provider,
    model: provider === "openrouter" ? process.env.OPENROUTER_MODELS || "google/gemini-3.8-flash (+ Flash fallbacks)" : GEMINI_MODEL,
    gemini: provider === "openrouter" || Boolean(process.env.GEMINI_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
    supabase: isSupabaseConfigured(),
  };
  if (new URL(request.url).searchParams.get("probe") !== "1" || !config.gemini) {
    return Response.json({ config });
  }

  const probe = async (run: () => Promise<unknown>) => {
    const started = Date.now();
    try {
      const detail = await run();
      return { ok: true, ms: Date.now() - started, detail };
    } catch (err) {
      return { ok: false, ms: Date.now() - started, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
    }
  };
  const [json, search] = await Promise.all([
    probe(() =>
      generateJson<{ ok: boolean }>({
        system: "Reply with JSON.",
        prompt: 'Return {"ok": true}.',
        schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      }),
    ),
    probe(async () => (await groundedSearch("Name one partner at Blume Ventures. One line.")).sources.length + " sources"),
  ]);
  return Response.json({ config, probe: { json, search } });
}
