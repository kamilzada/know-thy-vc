"use client";

import { useEffect, useState } from "react";
import { domainOf } from "@/components/ui/SourceChip";

type Photo = { url: string; source: "firm" | "wikipedia"; pageUrl: string };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/** The investor's photo when a trustworthy source has one; otherwise their initials. */
export function InvestorAvatar({ name, firm, firmUrl }: { name: string; firm: string; firmUrl?: string }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ name, firm, ...(firmUrl ? { firmUrl } : {}) });
    fetch(`/api/photo?${q}`)
      .then((r) => r.json() as Promise<{ photo: Photo | null }>)
      .then((d) => !cancelled && setPhoto(d.photo))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [name, firm, firmUrl]);

  const show = photo && !failed;
  return (
    <figure className="shrink-0">
      <div className="h-24 w-24 overflow-hidden rounded-3xl bg-signature-diag shadow-[var(--shadow-accent)] md:h-28 md:w-28">
        {show ? (
          // eslint-disable-next-line @next/next/no-img-element -- external photo from a verified source
          <img
            src={photo.url}
            alt={`Photo of ${name}`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-3xl text-white">
            {initials(name)}
          </span>
        )}
      </div>
      {show && (
        <figcaption className="mt-1.5 max-w-28 truncate font-mono text-[10px] text-muted-foreground">
          <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Photo: {photo.source === "wikipedia" ? "Wikipedia" : domainOf(photo.pageUrl)}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
