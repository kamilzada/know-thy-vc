"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BriefHeader } from "@/components/brief/BriefHeader";
import { ContextList } from "@/components/brief/ContextList";
import { FitCard } from "@/components/brief/FitCard";
import { PortfolioGrid } from "@/components/brief/PortfolioGrid";
import { SourcesList } from "@/components/brief/SourcesList";
import { StatsStrip } from "@/components/brief/StatsStrip";
import { TalkingPoints } from "@/components/brief/TalkingPoints";
import { ThesisSection } from "@/components/brief/ThesisSection";
import { BriefForm } from "@/components/hero/BriefForm";
import { HeroGraphic } from "@/components/hero/HeroGraphic";
import { StartupPanel } from "@/components/hero/StartupPanel";
import { Reveal } from "@/components/motion/Reveal";
import { ElapsedTimer } from "@/components/progress/ElapsedTimer";
import { ProgressTimeline } from "@/components/progress/ProgressTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { computeFit } from "@/lib/fit";
import { hasErrors, validateInputs, type InputErrors } from "@/lib/input";
import { briefToMarkdown } from "@/lib/markdown";
import { DEFAULT_STARTUP_PROFILE, sanitizeProfile } from "@/lib/startupProfile";
import type { StartupProfile } from "@/lib/types";
import { useBriefStream } from "@/lib/useBriefStream";

const PROFILE_KEY = "ktvc-startup-profile";
const PROFILE_EVENT = "ktvc-profile-change";

/** The saved profile lives in browser storage; read it as an external store so SSR and hydration agree. */
function subscribeProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PROFILE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PROFILE_EVENT, onChange);
  };
}

function readProfileRaw(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

function parseProfile(raw: string | null): StartupProfile {
  try {
    return raw ? sanitizeProfile(JSON.parse(raw)) : DEFAULT_STARTUP_PROFILE;
  } catch {
    return DEFAULT_STARTUP_PROFILE;
  }
}

/** "Rahul Dash at Blume Ventures" → ["Rahul Dash", "Blume Ventures"] */
function splitSuggestion(s: string): [string, string] | null {
  const i = s.lastIndexOf(" at ");
  return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 4).trim()] : null;
}

export function BriefApp() {
  const [investor, setInvestor] = useState("");
  const [firm, setFirm] = useState("");
  const [errors, setErrors] = useState<InputErrors>({});
  const profileRaw = useSyncExternalStore(subscribeProfile, readProfileRaw, () => null);
  const [sessionProfile, setSessionProfile] = useState<StartupProfile | null>(null);
  const profile = useMemo(() => sessionProfile ?? parseProfile(profileRaw), [sessionProfile, profileRaw]);
  const { state, run } = useBriefStream();
  const briefRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [lastRun, setLastRun] = useState<{ investor: string; firm: string } | null>(null);

  useEffect(() => {
    if (state.phase === "done") briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // On phones the progress card sits below the form; bring it into view.
    if (state.phase === "running" && window.innerWidth < 1024) progressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.phase]);

  useEffect(() => {
    document.title = state.phase === "done" ? `${state.brief.investor.name} · Know Thy VC` : "Know Thy VC";
  }, [state]);

  const fit = useMemo(() => (state.phase === "done" ? computeFit(state.brief, profile) : null), [state, profile]);

  async function generate(name = investor, company = firm, fresh = false) {
    const fieldErrors = validateInputs(name, company);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;
    setLastRun({ investor: name.trim(), firm: company.trim() });
    const serverErrors = await run({ investor: name.trim(), firm: company.trim(), profile, fresh });
    if (serverErrors) setErrors(serverErrors);
  }

  function pick(name: string, company: string) {
    setInvestor(name);
    setFirm(company);
    void generate(name, company);
  }

  function saveProfile(p: StartupProfile) {
    const clean = sanitizeProfile(p);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
      setSessionProfile(null);
      window.dispatchEvent(new Event(PROFILE_EVENT));
    } catch {
      // Private mode: the profile still applies for this visit.
      setSessionProfile(clean);
    }
  }

  const busy = state.phase === "running";

  return (
    <>
      <section className="no-print relative">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:py-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-40">
          <div className="min-w-0">
            <Reveal>
              <SectionLabel pulse>Live investor intel</SectionLabel>
              <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] md:text-6xl lg:text-[5.25rem]">
                Walk into every pitch <GradientText underline>prepared.</GradientText>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Name and firm in. A sourced investor brief out, in under two minutes.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-10">
              <BriefForm
                investor={investor}
                firm={firm}
                errors={errors}
                busy={busy}
                onChange={(field, value) => {
                  if (field === "investor") setInvestor(value);
                  else setFirm(value);
                  if (errors[field]) setErrors({ ...errors, [field]: undefined });
                }}
                onSubmit={() => void generate()}
                onPick={pick}
              />
              <StartupPanel profile={profile} onSave={saveProfile} />
            </Reveal>
          </div>

          <div ref={progressRef} className="min-w-0 scroll-mt-24">
            {state.phase === "idle" ? (
              <div className="hidden lg:block">
                <HeroGraphic />
              </div>
            ) : (
              <Card variant="elevated" className="p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <p className="font-semibold">
                    {state.phase === "running" ? "Researching" : state.phase === "done" ? "Brief ready" : "Stopped"}
                    {lastRun && <span className="font-normal text-muted-foreground"> · {lastRun.investor}</span>}
                  </p>
                  <ElapsedTimer startedAt={state.startedAt} stoppedAt={state.phase === "running" ? undefined : state.stoppedAt} />
                </div>
                {state.phase === "done" && state.cached ? (
                  <p className="text-sm text-muted-foreground">Loaded from a brief generated in the last 24 hours. Use Regenerate for a fresh one.</p>
                ) : (
                  <ProgressTimeline steps={state.steps} />
                )}
                {state.phase === "error" && (
                  <div role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
                    <p className="flex items-start gap-2 font-medium text-foreground">
                      <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                      {state.message}
                    </p>
                    {state.suggestions && state.suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground">Did you mean:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {state.suggestions.map((s) => {
                            const parts = splitSuggestion(s);
                            return parts ? (
                              <button
                                key={s}
                                type="button"
                                onClick={() => pick(parts[0], parts[1])}
                                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-accent/40 hover:text-accent"
                              >
                                {s}
                              </button>
                            ) : (
                              <span key={s} className="rounded-full bg-muted px-3 py-1.5 text-sm">
                                {s}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {state.code !== "not_found" && state.code !== "missing_config" && (
                      <Button variant="secondary" size="sm" className="mt-4" onClick={() => void generate(lastRun?.investor, lastRun?.firm)}>
                        <RotateCw aria-hidden className="h-4 w-4" /> Try again
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </section>

      {state.phase === "done" && fit && (
        <div ref={briefRef} className="mx-auto max-w-6xl scroll-mt-24 space-y-20 px-4 pb-24 sm:px-6 md:space-y-28">
          <div className="hidden print:block">
            <p className="font-display text-lg">
              Know Thy <span className="text-accent">VC</span>
            </p>
            <p className="font-mono text-xs">Generated {new Date(state.brief.generatedAt).toLocaleString("en-IN")}</p>
          </div>
          <Reveal>
            <BriefHeader
              brief={state.brief}
              cached={state.cached}
              onCopy={() => navigator.clipboard.writeText(briefToMarkdown(state.brief, fit))}
              onRegenerate={() => lastRun && void generate(lastRun.investor, lastRun.firm, true)}
            />
          </Reveal>
          <Reveal>
            <StatsStrip brief={state.brief} durationMs={state.durationMs} fit={fit} />
          </Reveal>
          <PortfolioGrid brief={state.brief} />
          <ThesisSection brief={state.brief} />
          <ContextList brief={state.brief} />
          <TalkingPoints brief={state.brief} />
          <FitCard fit={fit} profile={profile} />
          <SourcesList brief={state.brief} />
        </div>
      )}
    </>
  );
}
