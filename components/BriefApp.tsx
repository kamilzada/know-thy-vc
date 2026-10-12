"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BriefView } from "@/components/brief/BriefView";
import { BriefForm } from "@/components/hero/BriefForm";
import { HeroGraphic } from "@/components/hero/HeroGraphic";
import { StartupCard, type ProfileStatus } from "@/components/hero/StartupCard";
import { Reveal } from "@/components/motion/Reveal";
import { ElapsedTimer } from "@/components/progress/ElapsedTimer";
import { ProgressTimeline } from "@/components/progress/ProgressTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasErrors, validateInputs, type InputErrors } from "@/lib/input";
import { DEFAULT_STARTUP_PROFILE, sanitizeProfile } from "@/lib/startupProfile";
import type { StartupProfile } from "@/lib/types";
import { useBriefStream } from "@/lib/useBriefStream";

const PROFILE_KEY = "ktvc-startup-profile";

function readLocalProfile(): StartupProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? sanitizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocalProfile(profile: StartupProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

const sameProfile = (a: StartupProfile, b: StartupProfile) => JSON.stringify(a) === JSON.stringify(b);

/** "Rahul Dash at Blume Ventures" → ["Rahul Dash", "Blume Ventures"] */
function splitSuggestion(s: string): [string, string] | null {
  const i = s.lastIndexOf(" at ");
  return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 4).trim()] : null;
}

export function BriefApp() {
  const [investor, setInvestor] = useState("");
  const [firm, setFirm] = useState("");
  const [errors, setErrors] = useState<InputErrors>({});
  const [profile, setProfile] = useState<StartupProfile>(DEFAULT_STARTUP_PROFILE);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({ storage: "browser", saved: false, loading: true });
  const { state, run } = useBriefStream();
  const briefRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [lastRun, setLastRun] = useState<{ investor: string; firm: string } | null>(null);

  // Load the profile: Supabase when it's connected, otherwise this browser.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json() as Promise<{ profile: StartupProfile; saved: boolean; storage: "supabase" | "none" }>)
      .then((data) => {
        if (cancelled) return;
        if (data.storage === "supabase") {
          setProfile(sanitizeProfile(data.profile));
          setProfileStatus({ storage: "supabase", saved: data.saved, loading: false });
        } else {
          const local = readLocalProfile();
          if (local) setProfile(local);
          setProfileStatus({ storage: "browser", saved: Boolean(local), loading: false });
        }
      })
      .catch(() => {
        if (cancelled) return;
        const local = readLocalProfile();
        if (local) setProfile(local);
        setProfileStatus({ storage: "browser", saved: Boolean(local), loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.phase === "done") briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // On phones the progress card sits below the form; bring it into view.
    if (state.phase === "running" && window.innerWidth < 1024) progressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.phase]);

  useEffect(() => {
    document.title = state.phase === "done" ? `${state.brief.investor.name} · Know Thy VC` : "Know Thy VC";
  }, [state]);

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

  async function saveProfile(p: StartupProfile): Promise<boolean> {
    const clean = sanitizeProfile(p);
    if (profileStatus.storage === "supabase") {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => null);
      if (!res?.ok) {
        const body = (await res?.json().catch(() => null)) as { error?: string } | null;
        setProfileStatus({ ...profileStatus, error: body?.error ?? "Couldn't save the profile. Try again." });
        return false;
      }
    } else {
      writeLocalProfile(clean);
    }
    setProfile(clean);
    setProfileStatus({ ...profileStatus, saved: true, error: undefined });
    return true;
  }

  const isSample = !profileStatus.saved && sameProfile(profile, DEFAULT_STARTUP_PROFILE);

  const busy = state.phase === "running";

  return (
    <>
      <section className="no-print relative">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-28">
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
            <Reveal delay={0.1} className="mt-10 space-y-8">
              <div>
                <StepHeading n="01" title="Your startup" />
                <StartupCard profile={profile} status={profileStatus} isSample={isSample} disabled={busy} onSave={saveProfile} />
              </div>
              <div>
                <StepHeading n="02" title="Investor to research" />
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
              </div>
            </Reveal>
          </div>

          <div ref={progressRef} className="min-w-0 scroll-mt-24 lg:sticky lg:top-24">
            {state.phase === "idle" ? (
              <div className="hidden lg:block lg:pt-24">
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

      {state.phase === "done" && (
        <BriefView
          ref={briefRef}
          brief={state.brief}
          profile={profile}
          durationMs={state.durationMs}
          cached={state.cached}
          onRegenerate={() => lastRun && void generate(lastRun.investor, lastRun.firm, true)}
        />
      )}
    </>
  );
}

function StepHeading({ n, title }: { n: string; title: string }) {
  return (
    <p className="mb-3 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signature font-mono text-[11px] text-white">{n}</span>
      <span className="font-semibold">{title}</span>
    </p>
  );
}
