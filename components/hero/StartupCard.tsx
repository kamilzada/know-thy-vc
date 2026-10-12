"use client";

import { Check, Cloud, HardDrive, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { StartupProfile } from "@/lib/types";

const FIELDS: { key: keyof StartupProfile; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "name", label: "Startup name", placeholder: "e.g. Kulhad Co." },
  { key: "stage", label: "Stage", placeholder: "e.g. Seed, raising Series A" },
  { key: "oneLiner", label: "One-liner", placeholder: "What you sell, to whom", wide: true },
  { key: "sector", label: "Sector", placeholder: "e.g. D2C consumer brand" },
  { key: "raiseAmount", label: "Raising", placeholder: "e.g. ₹25 crore Series A" },
  { key: "traction", label: "Traction", placeholder: "Revenue, growth, retention", wide: true },
];

const STATS: { key: keyof StartupProfile; label: string }[] = [
  { key: "stage", label: "Stage" },
  { key: "sector", label: "Sector" },
  { key: "raiseAmount", label: "Raising" },
  { key: "traction", label: "Traction" },
];

export type ProfileStatus = { storage: "supabase" | "browser"; saved: boolean; loading: boolean; error?: string };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/** Who Priya is pitching as. Every talking point and the fit score are built from this. */
export function StartupCard({
  profile,
  status,
  isSample,
  disabled,
  onSave,
}: {
  profile: StartupProfile;
  status: ProfileStatus;
  isSample: boolean;
  disabled?: boolean;
  onSave: (p: StartupProfile) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (editing) {
    return (
      <Card variant="elevated" className="p-5 md:p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            const ok = await onSave(draft);
            setSaving(false);
            if (ok) {
              setEditing(false);
              setJustSaved(true);
              setTimeout(() => setJustSaved(false), 2500);
            }
          }}
        >
          <p className="mb-4 text-sm text-muted-foreground">Talking points and the fit score are written for this. Be specific about traction.</p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                name={`profile-${f.key}`}
                label={f.label}
                placeholder={f.placeholder}
                value={draft[f.key]}
                className={cn(f.wide && "sm:col-span-2")}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            ))}
          </div>
          {status.error && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {status.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {status.storage === "supabase" ? "Saved to your workspace (Supabase)" : "Saved in this browser"}
            </span>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="p-5 md:p-6">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-signature" />
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-signature-diag font-display text-lg text-white shadow-[var(--shadow-accent)]">
          {initials(profile.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Pitching as</p>
          <p className={cn("truncate font-display text-2xl leading-tight", status.loading && "animate-pulse text-muted-foreground")}>{profile.name}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{profile.oneLiner}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || status.loading}
          onClick={() => {
            setDraft(profile);
            setEditing(true);
          }}
          className="shrink-0"
        >
          <Pencil aria-hidden className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.key} className="min-w-0 rounded-xl bg-muted/70 px-3 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{s.label}</dt>
            <dd className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug" title={profile[s.key]}>
              {profile[s.key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {isSample ? (
          <span className="inline-flex items-center gap-1.5 text-accent">
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> Sample startup. Add yours for briefs written for you.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {justSaved ? <Check aria-hidden className="h-3.5 w-3.5 text-accent" /> : status.storage === "supabase" ? <Cloud aria-hidden className="h-3.5 w-3.5" /> : <HardDrive aria-hidden className="h-3.5 w-3.5" />}
            {justSaved ? "Saved" : status.storage === "supabase" ? "Saved to your workspace" : "Saved in this browser"}
          </span>
        )}
        <span className="hidden sm:inline">·</span>
        <span>Talking points and fit score are tailored to this.</span>
      </div>
    </Card>
  );
}
