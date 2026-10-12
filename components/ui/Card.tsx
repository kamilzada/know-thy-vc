import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const card = cva(
  "group/card relative overflow-hidden rounded-2xl bg-card transition-shadow duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-accent/[0.03] before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100",
  {
    variants: {
      variant: {
        default: "border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
        elevated: "border border-border shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)]",
        featured: "shadow-[var(--shadow-lg)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type Props = HTMLAttributes<HTMLDivElement> & VariantProps<typeof card>;

export function Card({ className, variant, children, ...props }: Props) {
  if (variant === "featured") {
    // 2px gradient border via a nested div.
    return (
      <div className="rounded-2xl bg-signature-diag p-[2px] shadow-[var(--shadow-accent)]">
        <div className={cn(card({ variant }), "h-full", className)} {...props}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={cn(card({ variant }), className)} {...props}>
      {children}
    </div>
  );
}
