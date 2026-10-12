import { GEMINI_MODEL, groundedSearch } from "@/lib/gemini";
import { GoogleGenAI } from "@google/genai";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Reports which services are configured. With ?probe=1 it also makes two tiny Gemini calls. */
export async function GET(request: Request) {
  const config = {
    model: GEMINI_MODEL,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    tavily: Boolean(process.env.TAVILY_API_KEY),
    supabase: isSupabaseConfigured(),
  };
  if (new URL(request.url).searchParams.get("probe") !== "1" || !config.gemini) {
    return Response.json({ config });
  }

  const probe = async (run: () => Promise<unknown>) => {
    const started = Date.now();
    try {
      await run();
      return { ok: true, ms: Date.now() - started };
    } catch (err) {
      return { ok: false, ms: Date.now() - started, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
    }
  };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const [plain, grounded] = await Promise.all([
    probe(() => ai.models.generateContent({ model: GEMINI_MODEL, contents: "Reply with ok." })),
    probe(() => groundedSearch("Name one partner at Blume Ventures. One line.")),
  ]);
  return Response.json({ config, probe: { plain, grounded } });
}
