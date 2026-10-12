import { cn } from "@/lib/cn";
import { Pulse } from "@/components/motion/Pulse";

export function SectionLabel({ children, pulse, inverted, className }: { children: React.ReactNode; pulse?: boolean; inverted?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[0.15em]",
        inverted ? "border-background/15 bg-background/5 text-background/70" : "border-border bg-card text-muted-foreground",
        className,
      )}
    >
      {pulse ? <Pulse className="h-1.5 w-1.5 rounded-full bg-accent" /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      {children}
    </p>
  );
}
