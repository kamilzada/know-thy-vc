import { requireEnv, toBriefError } from "./errors";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

type SearchOptions = {
  topic?: "general" | "news";
  /** Only return pages published within this many days. */
  sinceDays?: number;
  maxResults?: number;
  signal?: AbortSignal;
};

export function isoDaysAgo(days: number, from = new Date()): string {
  return new Date(from.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function tavilySearch(query: string, opts: SearchOptions = {}): Promise<TavilyResult[]> {
  const apiKey = requireEnv("TAVILY_API_KEY", "Tavily");
  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query,
        topic: opts.topic ?? "general",
        search_depth: "basic",
        max_results: opts.maxResults ?? 6,
        include_published_date: true,
        ...(opts.sinceDays ? { start_date: isoDaysAgo(opts.sinceDays) } : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    throw toBriefError(err, "Tavily");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw toBriefError(Object.assign(new Error(`HTTP ${res.status} ${body.slice(0, 150)}`), { status: res.status }), "Tavily");
  }
  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}
