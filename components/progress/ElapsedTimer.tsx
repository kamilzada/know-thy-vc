"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

/** `00:34 / 02:00`: quietly proves the "under two minutes" requirement. */
export function ElapsedTimer({ startedAt, stoppedAt }: { startedAt: number; stoppedAt?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (stoppedAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [stoppedAt]);
  const elapsed = (stoppedAt ?? now) - startedAt;
  return (
    <p className="font-mono text-sm tabular-nums text-muted-foreground">
      <span className="text-foreground">{formatClock(elapsed)}</span> / 02:00
    </p>
  );
}
