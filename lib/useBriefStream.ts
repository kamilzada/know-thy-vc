"use client";

import { useCallback, useRef, useState } from "react";
import { INITIAL_STEPS, type Steps } from "@/components/progress/ProgressTimeline";
import type { Brief, BriefEvent, Entity, ErrorCode, StartupProfile } from "./types";
import type { InputErrors } from "./input";

export type BriefState =
  | { phase: "idle" }
  | { phase: "running"; startedAt: number; steps: Steps; entity?: Entity }
  | { phase: "done"; startedAt: number; stoppedAt: number; steps: Steps; brief: Brief; durationMs: number; cached: boolean }
  | { phase: "error"; startedAt: number; stoppedAt: number; steps: Steps; code: ErrorCode; message: string; suggestions?: string[] };

/** POSTs to /api/brief and folds the server-sent events into UI state. */
export function useBriefStream() {
  const [state, setState] = useState<BriefState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (opts: { investor: string; firm: string; profile: StartupProfile; fresh?: boolean }): Promise<InputErrors | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = Date.now();
      let steps: Steps = { ...INITIAL_STEPS };
      setState({ phase: "running", startedAt, steps });

      const fail = (code: ErrorCode, message: string, suggestions?: string[]) =>
        setState({ phase: "error", startedAt, stoppedAt: Date.now(), steps, code, message, suggestions });

      let res: Response;
      try {
        res = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opts),
          signal: controller.signal,
        });
      } catch {
        if (!controller.signal.aborted) fail("upstream", "Couldn't reach the server. Check your connection and try again.");
        return null;
      }

      if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as { fields?: InputErrors };
        setState({ phase: "idle" });
        return body.fields ?? {};
      }
      if (!res.ok || !res.body) {
        fail("upstream", `The server returned an error (${res.status}). Try again.`);
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const event = JSON.parse(line.slice(6)) as BriefEvent;
            if (event.type === "step") {
              steps = { ...steps, [event.step]: { status: event.status, detail: event.detail, ms: event.ms } };
              setState((s) => (s.phase === "running" ? { ...s, steps } : s));
            } else if (event.type === "resolved") {
              setState((s) => (s.phase === "running" ? { ...s, entity: event.entity } : s));
            } else if (event.type === "brief") {
              finished = true;
              setState({
                phase: "done",
                startedAt,
                stoppedAt: Date.now(),
                steps,
                brief: event.brief,
                durationMs: event.durationMs,
                cached: event.cached,
              });
            } else if (event.type === "error") {
              finished = true;
              fail(event.code, event.message, event.suggestions);
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return null;
      }
      if (!finished && !controller.signal.aborted) fail("upstream", "The connection closed before the brief finished. Try again.");
      return null;
    },
    [],
  );

  return { state, run };
}
