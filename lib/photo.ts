import "server-only";

export type InvestorPhoto = { url: string; source: "firm" | "wikipedia"; pageUrl: string };

const TIMEOUT_MS = 6000;
const UA = "Mozilla/5.0 (compatible; KnowThyVC/1.0; +https://know-thy-vc.vercel.app)";

/**
 * Finds a photo of the investor, but only from sources that tie the image to this person:
 * an image on the firm's own site labelled with their name, or a Wikipedia page that
 * mentions the firm. Anything less certain returns null, so we never show a stranger's face.
 */
export async function findInvestorPhoto(name: string, firm: string, firmUrl?: string): Promise<InvestorPhoto | null> {
  const tokens = nameTokens(name);
  if (tokens.length < 2) return null;
  if (firmUrl && isSafePublicUrl(firmUrl)) {
    const fromFirm = await fromFirmPage(firmUrl, tokens).catch(() => null);
    if (fromFirm) return fromFirm;
  }
  return fromWikipedia(name, firm).catch(() => null);
}

async function fromFirmPage(pageUrl: string, tokens: string[]): Promise<InvestorPhoto | null> {
  const res = await fetch(pageUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null;
  const html = (await res.text()).slice(0, 600_000);

  // 1. An <img> whose alt text names this person (team grids usually do this).
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const alt = attr(tag, "alt");
    const src = attr(tag, "src") || attr(tag, "data-src") || firstSrcset(attr(tag, "srcset"));
    if (!alt || !src || !hasAllTokens(alt, tokens)) continue;
    const url = absolute(src, pageUrl);
    if (url) return { url, source: "firm", pageUrl };
  }

  // 2. The page's share image, only when both the page and the image file are named after this
  //    person. Share images are often just the firm's logo, so the page name alone isn't enough.
  const path = new URL(pageUrl).pathname.toLowerCase();
  if (tokens.every((t) => path.includes(t))) {
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
    const url = og ? absolute(attr(og, "content"), pageUrl) : null;
    const file = url ? new URL(url).pathname.toLowerCase() : "";
    if (url && tokens.some((t) => t.length > 2 && file.includes(t))) return { url, source: "firm", pageUrl };
  }
  return null;
}

async function fromWikipedia(name: string, firm: string): Promise<InvestorPhoto | null> {
  const title = encodeURIComponent(name.trim().replace(/\s+/g, "_"));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const page = (await res.json()) as {
    type?: string;
    extract?: string;
    thumbnail?: { source: string };
    content_urls?: { desktop?: { page?: string } };
  };
  if (page.type !== "standard" || !page.thumbnail?.source) return null;
  // Same name isn't enough: the article has to mention the firm.
  const firmWord = firm.split(/\s+/).find((w) => w.length > 3 && !/^(the|capital|ventures|partners|fund)$/i.test(w)) ?? firm;
  if (!page.extract?.toLowerCase().includes(firmWord.toLowerCase())) return null;
  return { url: page.thumbnail.source, source: "wikipedia", pageUrl: page.content_urls?.desktop?.page ?? "https://en.wikipedia.org" };
}

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s-]/g, "")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1);
}

function hasAllTokens(text: string, tokens: string[]) {
  const t = text.toLowerCase().normalize("NFKD");
  return tokens.every((tok) => t.includes(tok));
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1]?.trim() ?? "";
}

function firstSrcset(srcset: string) {
  return srcset.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}

function absolute(src: string, base: string) {
  try {
    const u = new URL(src.replace(/&amp;/g, "&"), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Only public web addresses: no localhost, raw IPs or internal hostnames. */
function isSafePublicUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":") && !/^(localhost|.*\.local|.*\.internal)$/i.test(host);
  } catch {
    return false;
  }
}
