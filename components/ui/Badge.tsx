import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Variants map straight onto the Brief JSON enums. Severity always carries text, never colour alone. */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.1em] whitespace-nowrap",
  {
    variants: {
      variant: {
        info: "bg-accent/10 text-accent",
        watch: "bg-muted text-foreground",
        red_flag: "bg-danger/10 text-danger",
        "confidence-high": "bg-accent/10 text-accent",
        "confidence-medium": "bg-muted text-foreground",
        "confidence-low": "border border-border bg-card text-muted-foreground",
        neutral: "bg-muted text-muted-foreground",
        inverted: "bg-background/10 text-background",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type Props = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

export function Badge({ className, variant, ...props }: Props) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}

export const SEVERITY_LABEL = { info: "Info", watch: "Watch", red_flag: "Red flag" } as const;
