import { resolveEntity } from "@/lib/agents/resolveEntity";
import { numberSources, runResearch, type AgentResult } from "@/lib/agents/research";
import { synthesize } from "@/lib/agents/synthesize";
import { BriefError, toBriefError, withTimeout } from "@/lib/errors";
import { hasErrors, validateInputs } from "@/lib/input";
import { sanitizeProfile } from "@/lib/startupProfile";
import { findCachedBrief, saveBrief } from "@/lib/supabase";
import type { BriefEvent, Section, StepId } from "@/lib/types";
import { validateBrief } from "@/lib/validate";

// The whole pipeline targets ~30–45s; this is headroom, still inside the 2-minute promise.
export const maxDuration = 120;

const RESOLVE_TIMEOUT_MS = 25_000;
const SYNTHESIS_TIMEOUT_MS = 45_000;

/**
 * Brief orchestrator. Streams progress as server-sent events:
 * cache → resolve → 4 research agents in parallel → one Gemini synthesis → validator → save.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const investor = typeof body?.investor === "string" ? body.investor.trim() : "";
  const firm = typeof body?.firm === "string" ? body.firm.trim() : "";

  const inputErrors = validateInputs(investor, firm);
  if (hasErrors(inputErrors)) {
    return Response.json({ error: "invalid_input", fields: inputErrors }, { status: 400 });
  }
  const profile = sanitizeProfile(body?.profile);
  const fresh = body?.fresh === true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (event: BriefEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          open = false; // client went away
        }
      };
      const stepStarted = new Map<StepId, number>();
      const step = (s: StepId, status: "active" | "done" | "low" | "error", detail?: string) => {
        if (status === "active") stepStarted.set(s, Date.now());
        const started = stepStarted.get(s);
        const ms = status !== "active" && started ? Date.now() - started : undefined;
        send({ type: "step", step: s, status, detail, ms });
      };

      const startedAt = Date.now();
      try {
        // 1. Cache
        if (!fresh) {
          const cached = await findCachedBrief(investor, firm, profile);
          if (cached) {
            send({ type: "brief", brief: cached.brief, cached: true, durationMs: cached.duration_ms ?? 0, id: cached.id });
            return;
          }
        }

        // 2. Entity resolution
        step("resolve", "active");
        const entity = await withTimeout(RESOLVE_TIMEOUT_MS, (signal) => resolveEntity(investor, firm, signal)).catch(
          (err) => {
            throw toBriefError(err, "Gemini");
          },
        );
        if (!entity.found) {
          step("resolve", "error");
          throw new BriefError(
            "not_found",
            `We couldn't confirm ${investor} at ${firm}.${entity.disambiguation ? ` ${entity.disambiguation}` : ""}`,
            entity.suggestions,
          );
        }
        step("resolve", "done", [entity.fullName, entity.role].filter(Boolean).join(" · "));
        send({ type: "resolved", entity });

        // 3. Parallel research; each agent reports as soon as it lands
        const research = runResearch(entity);
        const agents = Object.fromEntries(
          await Promise.all(
            (Object.entries(research) as [Section | "overview", Promise<AgentResult>][]).map(async ([name, p]) => {
              step(name, "active");
              const result = await p;
              const found = result.sources.length;
              step(name, result.ok && found > 0 ? "done" : "low", result.ok ? `${found} sources` : result.error);
              return [name, result] as const;
            }),
          ),
        ) as Record<Section | "overview", AgentResult>;

        const sources = numberSources(
          [agents.portfolio, agents.thesis, agents.context, agents.overview],
          entity.sources,
        );
        if (sources.length === 0 && !agents.overview.summary) {
          const reasons = Object.values(agents).map((a) => a.error).filter(Boolean);
          throw new BriefError(
            "upstream",
            `Every search came back empty${reasons.length ? ` (${reasons[0]})` : ""}. Try again in a minute.`,
          );
        }

        // 4–5. One synthesis call with a JSON schema
        step("write", "active");
        const draft = await withTimeout(SYNTHESIS_TIMEOUT_MS, (signal) =>
          synthesize({ entity, sources, overview: agents.overview.summary, profile, signal }),
        ).catch((err) => {
          throw toBriefError(err, "Gemini");
        });
        step("write", "done");

        // 6. Validator (code, no LLM)
        step("verify", "active");
        const brief = validateBrief({ draft, entity, sources, agents });
        step(
          "verify",
          "done",
          `${brief.sources.length} sources cited${brief.validation.droppedClaims ? ` · ${brief.validation.droppedClaims} uncited claims dropped` : ""}`,
        );

        // 7. Persist, then render
        const durationMs = Date.now() - startedAt;
        const id = await saveBrief({ investor, firm, profile, brief, durationMs });
        send({ type: "brief", brief, cached: false, durationMs, id: id ?? undefined });
      } catch (err) {
        const e = err instanceof BriefError ? err : toBriefError(err, "The brief pipeline");
        if (!(err instanceof BriefError)) console.error("[brief] unexpected error", err);
        send({ type: "error", code: e.code, message: e.message, suggestions: e.suggestions });
      } finally {
        open = false;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
