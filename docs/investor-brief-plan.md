# Know Thy VC: Build Plan

**Product name:** Know Thy VC
**Tagline:** *Know thy VC. Walk in prepared.*
**Repo / Vercel project:** `know-thy-vc` → `know-thy-vc.vercel.app` (fall back to `knowthyvc` if taken)

**Assignment:** MESA C4, AI & its Applications, Section 1 Final (Problem Statement 1, Medium: Pre-Meeting Investor Brief)
**Hard constraints:** live external data · Gemini Flash only (no Claude API) · deployed on Vercel · submit public URL + GitHub repo + Components Map · brief in under 2 minutes
**Stack decided:** Next.js (App Router, TypeScript, Tailwind) on Vercel + Supabase (Postgres, optional auth)
**Design:** see `claude/design-system.md`

---

## 0. ⚠️ Deadline sprint: build due EOD 12 Oct 2026, viva 15 Oct 2:00–8:00 PM

**Scoring (out of 100):** Build 60 = Components Map 10 · Working Vercel link 10 · Design 10 · Backend logic & build quality 25 · Demo video 5. Viva 40.
**Medium is judged on:** scoping the problem correctly · reliable outputs · handling edge cases · demonstrating it works.
**Rule from the brief:** a strong, working Medium solution beats a half-working one. Cut scope, not quality.

### Scope cuts for today
| Keep (scores marks) | Cut or simplify |
|---|---|
| Two-input form + brief with all 4 required sections + sources | Separate Settings page → startup profile in `lib/startupProfile.ts` + small editable "Your startup" panel on the home page |
| Parallel live search (Tavily + Gemini grounded) | Separate Extractor step → **merge into one Gemini synthesis call** with `responseSchema` (faster, fewer failure points) |
| Code validator (citations, 90-day filter, exactly 3 talking points) | Download PDF → `window.print()` with print CSS |
| Streamed progress steps + elapsed timer | History page → only if time is left (Supabase still saves every brief) |
| Supabase `briefs` table (save + 24h cache) | `sources` table → sources live inside the brief JSON |
| Edge-case handling (below) | Auth |
| Design system on the home + brief views | Hero graphic polish → simple version first |

**Simplified pipeline for today:** Cache → Entity resolve (Gemini grounded) → 3 Tavily searches + 1 grounded overview **in parallel** → **one** Gemini Flash synthesis (JSON schema) → validator → save to Supabase → render.

### Edge cases to handle and demo (Medium rubric)
1. Empty or one-word inputs → inline validation, no API call
2. Investor not found / doesn't match firm → "We couldn't confirm {name} at {firm}" plus suggestions from the resolver
3. Common name (two people) → firm used to pick; ambiguity shown as a note
4. No deals in last 90 days → explicit "No public deals found in 90 days" card, plus the most recent older deal labelled as older
5. One search API fails or times out → brief still renders; that section marked low confidence
6. Gemini returns bad JSON → one retry, then a friendly error
7. Missing API key / rate limit → clear error, not a blank screen
8. Uncited claim → dropped by the validator (visible in the source count)

### Time plan (IST, today)
| Time | Task | Rubric |
|---|---|---|
| 6:00–6:30 | Get keys (Gemini, Tavily, Supabase), scaffold, push to GitHub, **deploy to Vercel immediately** | Vercel link 10 |
| 6:30–8:00 | Backend: search layer, resolver, parallel research, synthesis, validator, `/api/brief` streaming | Backend 25 |
| 8:00–9:30 | UI in the design system: hero form, progress timeline, brief view | Design 10 |
| 9:30–10:00 | Supabase save + cache (history page if fast) | Backend |
| 10:00–10:45 | Edge cases; test 5 real investors; fix | Backend + viva |
| 10:45–11:15 | Components Map (Mermaid → PNG) + README | Components Map 10 |
| 11:15–11:45 | Demo video (2–3 min): problem → live run → edge case → architecture | Demo 5 |
| 11:45 | **Submit** (URL, repo, Components Map, video) | |

Keep a working version deployed at every step. Redeploy after each milestone so a bug at 11 PM never leaves you with nothing.

### Viva prep (before 15 Oct)
Be ready to explain: why Tavily + grounding, why one synthesis call, how hallucinations are prevented (citations + validator), the 90-day logic, the LinkedIn limitation, latency numbers, cost per brief, and what you'd build next.

---

## 1. What the product does

Input: **Investor name** + **Firm** (plus Priya's startup profile, saved once).
Output, in under 2 minutes, a structured brief with:

1. **Recent portfolio activity**: new investments and exits in the last 90 days (company, date, round, amount, source link)
2. **Investment thesis**: what they say publicly (sectors, stage, check size, themes), with quotes and sources
3. **Context and red flags**: sectors they've moved away from, controversies, portfolio shutdowns or pivots, fund status
4. **3 tailored talking points**: tied to Priya's stage and sector, each pointing to the evidence behind it
5. **Sources**: every claim links to a URL with a date; a confidence label on each section

---

## 2. Architecture (Components Map)

```
[Browser UI: Next.js page]
   │  POST /api/brief {investor, firm}   ← streams progress events (SSE)
   ▼
[API route: Brief Orchestrator]  (Vercel serverless, maxDuration 60s)
   │
   ├─1─▶ [Cache check] ── Supabase `briefs` (same investor+firm < 24h → return)
   │
   ├─2─▶ [Entity Resolver]  Gemini Flash + Google Search grounding
   │        → confirms person, firm website, role, LinkedIn URL, aliases
   │
   ├─3─▶ [Parallel Research Agents]  (Promise.all)
   │        a. Portfolio Agent  → Tavily news search (last 90 days)
   │        b. Thesis Agent     → Tavily + firm website/blog/podcasts
   │        c. Context Agent    → Tavily: controversy, shutdown, layoffs, pivot
   │        d. Grounded Overview→ Gemini Flash w/ Google Search tool
   │
   ├─4─▶ [Extractor]  Gemini Flash, JSON schema output
   │        raw results → typed facts {claim, date, url, type}
   │        + date filter (drop >90 days for portfolio)
   │
   ├─5─▶ [Synthesizer]  Gemini Flash
   │        facts + startup profile → Brief JSON (4 sections + talking points)
   │
   ├─6─▶ [Validator]  code, no LLM
   │        drop claims with no source URL, dedupe, label confidence
   │
   └─7─▶ [Persist]  Supabase `briefs` + `sources`
   ▼
[Brief View]  sections · source chips · copy / download PDF / history
```

**External services:** Gemini API (Flash), Tavily Search API, Supabase, Vercel, GitHub.

---

## 3. Agent workflow in detail

| Step | Component | Model/tool | Input → Output | Time budget |
|---|---|---|---|---|
| 1 | Cache | Supabase | name+firm → cached brief or miss | <1s |
| 2 | Entity Resolver | Gemini Flash + Search grounding | name+firm → `{fullName, role, firmUrl, linkedinUrl, disambiguation}` | ~5s |
| 3a | Portfolio Agent | Tavily (`topic: news`, `days: 90`) | queries like `"{firm}" leads seed round`, `"{investor}" invests`, `"{firm}" portfolio acquired` → results | ~5s |
| 3b | Thesis Agent | Tavily + fetch firm site | `"{investor}" thesis`, `interview`, `podcast`, `"{firm}" focus` → results | ~5s |
| 3c | Context Agent | Tavily | `"{firm}" controversy`, `shut down`, `lawsuit`, `pivot`, `"{investor}" leaves` → results | ~5s |
| 3d | Grounded Overview | Gemini Flash + Google Search | open question → summary + grounding URLs | ~8s |
| 4 | Extractor | Gemini Flash (`responseSchema`) | raw text → `Fact[]` | ~8s |
| 5 | Synthesizer | Gemini Flash (`responseSchema`) | facts + profile → `Brief` | ~10s |
| 6 | Validator | TypeScript | Brief → cleaned Brief | <1s |
| 7 | Persist + render | Supabase / React | | <1s |

**Target total: ~30–45s**, well under the 2-minute requirement and inside Vercel's function limit.

**LinkedIn note:** LinkedIn can't be scraped. Use search snippets of public posts (Tavily/Google) and say so in the UI. This is an honest limitation to mention in the viva.

---

## 4. Data contracts

```ts
type Fact = {
  section: 'portfolio' | 'thesis' | 'context';
  claim: string;
  company?: string;
  eventType?: 'investment' | 'exit' | 'statement' | 'controversy' | 'shift';
  date?: string;        // ISO
  sourceUrl: string;
  sourceTitle: string;
};

type Brief = {
  investor: { name: string; firm: string; role?: string; firmUrl?: string };
  generatedAt: string;
  portfolioActivity: { company: string; type: 'investment'|'exit'; round?: string;
                       amount?: string; date: string; sourceUrl: string }[];
  thesis: { summary: string; sectors: string[]; stages: string[];
            quotes: { text: string; sourceUrl: string }[] };
  context: { point: string; severity: 'info'|'watch'|'red_flag'; sourceUrl: string }[];
  talkingPoints: { opener: string; why: string; evidenceUrl: string }[]; // exactly 3
  confidence: { portfolio: 'high'|'medium'|'low'; thesis: string; context: string };
  sources: { url: string; title: string; date?: string }[];
};
```

---

## 5. Supabase schema

```sql
create table startup_profile (
  id uuid primary key default gen_random_uuid(),
  name text, one_liner text, sector text, stage text,
  raise_amount text, traction text, updated_at timestamptz default now()
);

create table briefs (
  id uuid primary key default gen_random_uuid(),
  investor_name text not null,
  firm text not null,
  brief jsonb not null,
  duration_ms int,
  created_at timestamptz default now()
);
create index on briefs (lower(investor_name), lower(firm), created_at desc);

create table sources (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references briefs(id) on delete cascade,
  url text, title text, published_at timestamptz, section text
);
```

Seed `startup_profile` with Priya's D2C startup (e.g. stage: Seed / Series A, sector: D2C consumer brand). It stays editable in a Settings panel, so the main form keeps exactly two inputs.

---

## 6. Project structure

```
know-thy-vc/
├─ app/
│  ├─ page.tsx                 # form + live progress + brief view
│  ├─ history/page.tsx         # past briefs from Supabase
│  ├─ settings/page.tsx        # startup profile
│  └─ api/brief/route.ts       # orchestrator (SSE stream)
├─ lib/
│  ├─ gemini.ts                # client, grounded search, JSON-schema calls
│  ├─ tavily.ts                # search wrapper (days filter, domain filters)
│  ├─ agents/
│  │  ├─ resolveEntity.ts
│  │  ├─ portfolioAgent.ts
│  │  ├─ thesisAgent.ts
│  │  ├─ contextAgent.ts
│  │  ├─ extract.ts
│  │  └─ synthesize.ts
│  ├─ validate.ts
│  ├─ supabase.ts
│  └─ types.ts
├─ components/  (see design-system.md §7)
├─ supabase/migrations/001_init.sql
├─ docs/components-map.md      # submission artifact (Mermaid diagram)
└─ .env.example
```

**Env vars:** `GEMINI_API_KEY`, `TAVILY_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Use the latest **Gemini Flash** model available in Google AI Studio (check the exact model ID there) through the `@google/genai` SDK.

---

## 7. Build milestones (for Claude Code)

1. **Scaffold:** Next.js + TS + Tailwind, design tokens and UI primitives, env, Supabase client, migration, push to GitHub, first Vercel deploy (empty page live on day 1)
2. **Search layer:** `tavily.ts` + `gemini.ts` grounded search; a test route that returns raw results for one investor
3. **Agents:** resolver, 3 research agents in parallel, extractor with JSON schema
4. **Synthesis + validation:** Brief JSON, 3 talking points using the startup profile, drop uncited claims
5. **Streaming UI:** progress steps (Resolving → Researching → Writing → Done), brief cards, source chips
6. **Persistence:** cache (24h), history page, settings page
7. **Polish:** Download as PDF / Copy as Markdown, error states, "low data found" fallback
8. **Test and submit:** run 5 real investors, record timings, write README + Components Map, final Vercel deploy

---

## 8. Quality guardrails

- **No uncited claims:** the synthesizer may only use facts from step 4; the validator removes anything without a URL
- **Recency:** portfolio items must have a date within 90 days, otherwise they move to "older activity" or get dropped
- **Disambiguation:** if the resolver finds several people with the same name, use the firm to pick one; show "Did you mean…" if still unsure
- **Timeouts:** each agent gets ~15s; if one fails, the brief still renders with that section marked low confidence
- **Cost/rate limits:** cache briefs; cap Tavily at ~8 queries per brief

---

## 9. Test investors (live-data demo)

Choose active, well-covered Indian D2C or consumer investors so the demo has fresh data, e.g. partners at Fireside Ventures, DSG Consumer Partners, Peak XV, Sauce.vc, Blume. Confirm each returns recent deals before the demo.

---

## 10. Submission checklist

- [ ] Public Vercel URL working with live data
- [ ] GitHub repo `know-thy-vc` (README with setup, architecture, env vars)
- [ ] Components Map (diagram from section 2 as Mermaid/PNG in `docs/`)
- [ ] Confirm only Gemini Flash is used for AI
- [ ] Brief completes in under 2 min (show timing in UI)
