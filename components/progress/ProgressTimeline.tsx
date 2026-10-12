"use client";

import { Check, Circle, Minus, X } from "lucide-react";
import { Pulse } from "@/components/motion/Pulse";
import { cn } from "@/lib/cn";
import type { StepId, StepStatus } from "@/lib/types";

export type StepState = { status: StepStatus | "idle"; detail?: string; ms?: number };
export type Steps = Record<StepId, StepState>;

export const INITIAL_STEPS: Steps = {
  resolve: { status: "idle" },
  portfolio: { status: "idle" },
  thesis: { status: "idle" },
  context: { status: "idle" },
  overview: { status: "idle" },
  write: { status: "idle" },
  verify: { status: "idle" },
};

const GROUPS: { title: string; steps: { id: StepId; label: string }[] }[] = [
  { title: "Resolve", steps: [{ id: "resolve", label: "Confirm the investor at the firm" }] },
  {
    title: "Research",
    steps: [
      { id: "portfolio", label: "Portfolio · last 90 days" },
      { id: "thesis", label: "Thesis · interviews and posts" },
      { id: "context", label: "Context · red flags and fund news" },
      { id: "overview", label: "Live web overview" },
    ],
  },
  { title: "Write", steps: [{ id: "write", label: "Gemini Flash drafts the brief" }] },
  { title: "Verify", steps: [{ id: "verify", label: "Check every citation, date and quote" }] },
];

const STATUS_TEXT: Record<StepState["status"], string> = {
  idle: "waiting",
  active: "running",
  done: "done",
  low: "low data",
  error: "failed",
};

function StepIcon({ status }: { status: StepState["status"] }) {
  if (status === "done")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-signature-diag text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  if (status === "active")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
        <Pulse className="h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  if (status === "low")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  if (status === "error")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border text-border">
      <Circle className="h-2 w-2" />
    </span>
  );
}

/** Resolve → Portfolio · Thesis · Context → Write → Verify, with live status from the stream. */
export function ProgressTimeline({ steps }: { steps: Steps }) {
  const active = (Object.entries(steps) as [StepId, StepState][]).filter(([, s]) => s.status === "active").map(([id]) => id);
  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {active.length ? `Working on: ${active.join(", ")}` : ""}
      </p>
      <ol className="relative space-y-5">
        {GROUPS.map((group, gi) => (
          <li key={group.title} className="relative pl-10">
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px]",
                group.steps.some((s) => steps[s.id].status !== "idle") ? "bg-signature text-white" : "border border-border bg-card text-muted-foreground",
              )}
            >
              {gi + 1}
            </span>
            {gi < GROUPS.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-4px)] w-px bg-border" />}
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{group.title}</p>
            <ul className="mt-2 space-y-2">
              {group.steps.map((s) => {
                const state = steps[s.id];
                return (
                  <li key={s.id} className="flex items-start gap-3">
                    <StepIcon status={state.status} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", state.status === "idle" ? "text-muted-foreground" : "text-foreground")}>
                        {s.label}
                        <span className="sr-only">: {STATUS_TEXT[state.status]}</span>
                      </p>
                      {(state.detail || state.ms !== undefined) && state.status !== "active" && (
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={state.detail}>
                          {state.status === "low" ? "low data · " : ""}
                          {state.ms !== undefined ? `${(state.ms / 1000).toFixed(1)}s` : ""}
                          {state.detail && state.status !== "low" ? ` · ${state.detail}` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
