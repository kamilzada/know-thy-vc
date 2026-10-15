# Know Thy VC

*Know thy VC. Walk in prepared.*

**Live:** https://know-thy-vc.vercel.app

Enter an investor's name and firm and get a sourced pre-meeting brief in about 30–45 seconds:

1. **Recent portfolio activity:** investments and exits in the last 90 days, plus older deals labelled as older
2. **Investment thesis:** sectors, stages and direct quotes
3. **Context and red flags:** controversies, fund news and sector shifts, red flags first
4. **Three talking points** tailored to the founder's startup, each backed by evidence
5. **Sources:** every claim links to its source, with a confidence level per section

There's also a **fit score**, calculated in code from the checked brief, and a **History** page of saved briefs.

Built for MESA C4, AI & its Applications, Section 1 Final (Problem Statement 1, Medium: Pre-Meeting Investor Brief).

## How it works

![Components map](docs/components-map.png)

```
Browser ── POST /api/brief {investor, firm, profile} ──► progress streamed back (server-sent events)

1. Cache       Supabase: same investor + firm + startup profile in the last 24h → returned in ~1s
2. Confirm     Tavily search, judged by Gemini Flash: right person at this firm?
               If not → stop and show "Did you mean…" suggestions
3. Research    four searches at once, each with a time limit:
               Tavily · portfolio (last 90 days) · Tavily · thesis · Tavily · context · Exa web overview
4. Write       one Gemini Flash call with a JSON schema; every claim must cite a numbered source (S1, S2…)
5. Validate    plain code, no AI: drops uncited claims and quotes not found word for word in their source,
               applies the 90-day rule, sorts red flags first, sets confidence per section
6. Save        Supabase, then the brief is shown
```

**Gemini Flash is the only AI model.** When `OPENROUTER_API_KEY` is set, Gemini Flash is called through OpenRouter, which falls back across Flash versions if one is overloaded. Without it, the app calls Google directly with `GEMINI_API_KEY`.

**How made-up content is prevented:** the model never writes links, only source numbers, which the validator maps back to pages we actually fetched. Anything citing an unknown number is dropped, quotes must appear word for word in the source text, and each brief shows how many claims were removed.

**LinkedIn:** LinkedIn can't be scraped, so public posts only appear through search snippets.

## Edge cases

| Case | What happens |
|---|---|
| Empty or one-word name | Inline error, no API call |
| Investor not at that firm | "We couldn't confirm…" plus "Did you mean…" suggestions |
| Common name | The firm decides; ambiguity shown as a note |
| No deals in 90 days | "No public deals found" card plus older deals, labelled as older |
| A search fails or times out | Brief still renders; that section is marked low confidence |
| Bad JSON from the model | One retry, then a friendly error |
| Missing key or rate limit | Clear message instead of a blank screen |
| Uncited claim | Dropped by the validator and counted in the brief |

## Project layout

| Path | Role |
|---|---|
| `app/api/brief/route.ts` | Orchestrator; streams progress |
| `lib/agents/resolveEntity.ts` | Confirms the investor |
| `lib/agents/research.ts` | The four parallel searches |
| `lib/agents/synthesize.ts` | The single Gemini Flash call and its JSON schema |
| `lib/validate.ts` | Citation, quote, 90-day and confidence checks |
| `lib/fit.ts` | Fit score (code, no AI) |
| `lib/gemini.ts`, `lib/openrouter.ts`, `lib/tavily.ts` | API wrappers |
| `lib/supabase.ts`, `app/api/profile/route.ts` | Cache, history and the startup profile |
| `app/history`, `app/brief/[id]` | History page and saved briefs |
| `components/` | UI, built on the design system in `docs/design-system.md` |
| `supabase/migrations/001_init.sql` | Database tables |
| `tests/` | Validator, input and fit-score tests |

## Setup

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run dev
npm test
```

Run `supabase/migrations/001_init.sql` in the Supabase SQL editor. Supabase is optional: without it there's no cache or History, and the startup profile is kept in the browser.

| Env var | Needed for |
|---|---|
| `OPENROUTER_API_KEY` | Gemini Flash through OpenRouter, plus the Exa web overview (recommended) |
| `GEMINI_API_KEY` | Gemini Flash directly from Google, used when OpenRouter isn't set |
| `TAVILY_API_KEY` | Investor check and the three Tavily searches |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Cache, History and the saved profile |
| `GEMINI_MODEL`, `OPENROUTER_MODELS` | Optional model overrides |

`GET /api/health` shows which services are configured.

## Stack

Next.js (App Router, TypeScript, Tailwind v4) on Vercel · Gemini Flash · Tavily · Exa via OpenRouter · Supabase

Plan and design: `docs/investor-brief-plan.md`, `docs/design-system.md`, `docs/components-map.md`.
