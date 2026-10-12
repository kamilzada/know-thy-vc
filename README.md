# Know Thy VC

*Know thy VC. Walk in prepared.*

Enter an investor's name and firm and get a sourced pre-meeting brief in under two minutes: recent portfolio activity (last 90 days), investment thesis, context and red flags, and three talking points tailored to your startup. Every claim links to its source.

Built for MESA C4, AI & its Applications, Section 1 Final (Problem Statement 1, Medium). Gemini Flash is the only AI model used.

## How it works

```
POST /api/brief {investor, firm, profile?}   → streams progress as server-sent events
  1. Cache        Supabase: same investor + firm in the last 24h → return it
  2. Resolve      Gemini Flash + Google Search grounding → confirms the person at the firm
  3. Research     in parallel, 15s budget each:
                    Portfolio (Tavily news, 90 days) · Thesis (Tavily) · Context (Tavily) · Grounded overview (Gemini)
  4. Synthesize   one Gemini Flash call with a JSON schema; claims cite numbered sources (S1…), never raw URLs
  5. Validate     code, no LLM: drops claims citing unknown sources, drops quotes not found verbatim,
                  splits deals at 90 days, sorts red flags first, assigns confidence per section
  6. Save         Supabase `briefs`
```

| File | Role |
|---|---|
| `app/api/brief/route.ts` | Orchestrator (SSE stream) |
| `lib/agents/resolveEntity.ts` | Entity resolver |
| `lib/agents/research.ts` | Parallel research agents |
| `lib/agents/synthesize.ts` | Single synthesis call and schema |
| `lib/validate.ts` | Citation, recency and confidence checks |
| `lib/gemini.ts`, `lib/tavily.ts` | API wrappers |
| `lib/supabase.ts` | Cache and history |
| `lib/startupProfile.ts` | Default startup profile |

## Setup

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
npm test                     # validator and input tests
```

Run `supabase/migrations/001_init.sql` in the Supabase SQL editor. Supabase is optional: without it, briefs aren't cached or saved.

| Env var | Required |
|---|---|
| `GEMINI_API_KEY` | yes |
| `TAVILY_API_KEY` | yes (without it the brief falls back to Google-grounded data only) |
| `GEMINI_MODEL` | no, defaults to `gemini-flash-latest` |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | for cache and history |

**LinkedIn:** LinkedIn can't be scraped. Public posts only show up through search snippets.

See `docs/investor-brief-plan.md` and `docs/design-system.md` for the full plan.
