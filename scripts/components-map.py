from html import escape as e

W, H = 2000, 1260
INK, MUTED, LINE = "#0F172A", "#64748B", "#94A3B8"
ACCENT, DANGER = "#0052FF", "#DC2626"
SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
SERIF = "Georgia, 'Times New Roman', serif"
MONO = "Menlo, 'SF Mono', monospace"

out = []
def add(s): out.append(s)

def text(x, y, s, size=19, color=MUTED, weight=400, family=SANS, spacing=0, anchor="start"):
    add(f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{color}" letter-spacing="{spacing}" text-anchor="{anchor}">{e(s)}</text>')

def box(x, y, w, h, title, lines=(), kind="app"):
    if kind == "person":
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{INK}"/>')
        tc, lc = "#FFFFFF", "#CBD5E1"
    elif kind == "app":
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#FFFFFF" stroke="{ACCENT}" stroke-width="3"/>')
        tc, lc = INK, MUTED
    elif kind == "db":
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#EAF0FF" stroke="#BFD0FF" stroke-width="2"/>')
        tc, lc = INK, MUTED
    elif kind == "stop":
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#FFFFFF" stroke="#FCA5A5" stroke-width="2" stroke-dasharray="8 6"/>')
        tc, lc = DANGER, MUTED
    else:  # outside service
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>')
        tc, lc = INK, MUTED
    text(x + 30, y + 44, title, 25, tc, 600)
    for i, l in enumerate(lines):
        text(x + 30, y + 80 + i * 28, l, 19, lc)

def row(x, y, w, h, title, sub):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>')
    text(x + 28, y + h / 2 + 8, title, 22, INK, 600)
    text(x + 270, y + h / 2 + 7, sub, 18, MUTED)

def arrow(d, color=LINE, dashed=False, marker="a"):
    dash = ' stroke-dasharray="7 6"' if dashed else ""
    add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.5"{dash} marker-end="url(#{marker})"/>')

def band(y, h, label):
    add(f'<rect x="56" y="{y}" width="1888" height="{h}" rx="22" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>')
    text(88, y + 40, label, 15, ACCENT, 700, MONO, 2.5)

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add('<defs>'
    f'<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/></marker>'
    f'<marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{ACCENT}"/></marker>'
    f'<marker id="r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{DANGER}"/></marker>'
    '</defs>')
add(f'<rect width="{W}" height="{H}" fill="#F4F6FA"/>')

# Header
text(78, 82, "KNOW THY VC · MESA C4 · PROBLEM STATEMENT 1", 15, ACCENT, 700, MONO, 3)
text(76, 152, "Pre-meeting investor brief", 58, INK, 400, SERIF)
lx, ly = 1080, 112
add(f'<rect x="{lx}" y="{ly-17}" width="20" height="20" rx="5" fill="#FFFFFF" stroke="{ACCENT}" stroke-width="3"/>'); text(lx + 32, ly, "our app on Vercel", 18, MUTED)
lx += 210
add(f'<rect x="{lx}" y="{ly-17}" width="20" height="20" rx="5" fill="{INK}"/>'); text(lx + 32, ly, "person", 18, MUTED)
lx += 120
add(f'<rect x="{lx}" y="{ly-17}" width="20" height="20" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>'); text(lx + 32, ly, "outside service", 18, MUTED)
lx += 185
add(f'<rect x="{lx}" y="{ly-17}" width="20" height="20" rx="5" fill="#EAF0FF" stroke="#BFD0FF" stroke-width="2"/>'); text(lx + 32, ly, "database", 18, MUTED)
lx += 130
arrow(f"M{lx},{ly-7} L{lx+40},{ly-7}", DANGER, marker="r"); text(lx + 52, ly, "stops early", 18, MUTED)

# 1 · ASK
band(196, 300, "1 · ASK")
box(110, 290, 260, 112, "Priya", ["founder, meeting a VC"], "person")
arrow("M370,346 L462,346")
box(470, 262, 340, 170, "Web page", ["investor name + firm", "her startup profile", "live progress + timer"], "app")
arrow("M810,346 L892,346", ACCENT, marker="b")
box(900, 276, 360, 140, "Brief API", ["runs every step below", "streams progress back"], "app")
arrow("M1260,346 L1392,346", dashed=True)
text(1326, 330, "cached?", 15, MUTED, 400, MONO, anchor="middle")
box(1400, 280, 500, 132, "Supabase", ["saved briefs · 24-hour cache", "startup profile · History page"], "db")

# 2 · RESEARCH LIVE
band(526, 360, "2 · RESEARCH LIVE")
arrow("M1080,416 L1080,570", ACCENT, marker="b")
box(900, 578, 360, 150, "Confirm the investor", ["Tavily search + Gemini Flash", "right person, right firm?"], "app")
arrow("M900,653 L818,653", DANGER, marker="r")
box(470, 590, 340, 126, "Can't confirm", ["stops and shows", "“Did you mean…”"], "stop")
text(1400, 560, "ALL FOUR AT ONCE · ONE CAN FAIL SAFELY", 14, MUTED, 600, MONO, 1.5)
rows = [("Tavily · Portfolio", "deals in the last 90 days"), ("Tavily · Thesis", "interviews and posts"),
        ("Tavily · Context", "red flags, fund news"), ("Exa web search", "overview, via OpenRouter")]
for i, (t, s) in enumerate(rows):
    y = 576 + i * 76
    row(1400, y, 500, 64, t, s)
    my = y + 32
    arrow(f"M1260,653 C1330,653 1320,{my} 1392,{my}")

# 3 · WRITE, CHECK, SHOW
band(916, 270, "3 · WRITE, CHECK, SHOW")
arrow("M1650,868 L1650,900 L640,900 L640,972")
text(1000, 893, "every source, numbered S1, S2, S3…", 15, MUTED, 400, MONO)
box(470, 980, 340, 160, "Gemini Flash writes", ["one AI call, JSON format", "must cite a source number", "for every claim"], "other")
arrow("M810,1060 L892,1060", ACCENT, marker="b")
box(900, 975, 360, 170, "Validator · plain code", ["drops uncited claims", "drops quotes not in source", "90-day rule · confidence"], "app")
arrow("M1260,1060 L1392,1060", ACCENT, marker="b")
box(1400, 980, 500, 160, "Brief + fit score", ["deals · thesis · red flags · 3 openers", "every claim linked · about 40 s", "saved to Supabase"], "app")

text(78, 1228, "Next.js on Vercel · Gemini Flash is the only AI model · deployed from GitHub · know-thy-vc.vercel.app", 18, MUTED)
add("</svg>")
open(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "docs", "components-map.svg"), "w").write("\n".join(out))
print("ok")
