import { findInvestorPhoto } from "@/lib/photo";

/** GET /api/photo?name=…&firm=…&firmUrl=… → { photo: {url, source, pageUrl} | null } */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = (params.get("name") ?? "").slice(0, 80);
  const firm = (params.get("firm") ?? "").slice(0, 80);
  const firmUrl = params.get("firmUrl") ?? undefined;
  if (!name.trim() || !firm.trim()) return Response.json({ photo: null });
  const photo = await findInvestorPhoto(name, firm, firmUrl);
  return Response.json({ photo }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
