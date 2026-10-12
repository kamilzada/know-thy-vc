"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { StartupProfile } from "@/lib/types";

const FIELDS: { key: keyof StartupProfile; label: string }[] = [
  { key: "name", label: "Startup name" },
  { key: "oneLiner", label: "One-liner" },
  { key: "sector", label: "Sector" },
  { key: "stage", label: "Stage" },
  { key: "raiseAmount", label: "Raising" },
  { key: "traction", label: "Traction" },
];

/** The small "Your startup" panel; the talking points are tailored to this. */
export function StartupPanel({ profile, onSave }: { profile: StartupProfile; onSave: (p: StartupProfile) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(profile);

  return (
    <div className="mt-4">
      <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
        <span>
          Brief for: {profile.name} · {profile.stage} · {profile.sector}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setDraft(profile);
            setOpen((o) => !o);
          }}
          className="rounded-md px-1.5 py-0.5 text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? "Close" : "Edit"}
        </button>
      </p>
      {open && (
        <Card variant="elevated" className="mt-3 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(draft);
              setOpen(false);
            }}
          >
            <p className="mb-3 text-sm text-muted-foreground">Your startup. Talking points and the fit score are tailored to this.</p>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Input
                  key={f.key}
                  name={`profile-${f.key}`}
                  label={f.label}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              ))}
            </div>
            <Button type="submit" className="mt-1">
              Save profile
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
