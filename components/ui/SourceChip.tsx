import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./, "");
  } catch {
    return "source";
  }
}

/** Mono domain plus date; opens the source in a new tab. */
export function SourceChip({ url, date, title, inverted, className }: { url: string; date?: string; title?: string; inverted?: boolean; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title || url}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        inverted
          ? "border-background/15 text-background/70 hover:border-background/40 hover:text-background"
          : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-accent",
        className,
      )}
    >
      <span className="truncate">{domainOf(url)}</span>
      {date && <span className="opacity-70">· {formatShortDate(date)}</span>}
      <ExternalLink aria-hidden className="h-3 w-3 shrink-0 no-print" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
