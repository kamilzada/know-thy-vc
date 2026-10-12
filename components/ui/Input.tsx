import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Input({ label, error, hint, id, className, ...props }: Props) {
  const inputId = id ?? props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "h-14 w-full rounded-xl border bg-card px-4 text-base text-foreground shadow-[var(--shadow-sm)] transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          error ? "border-danger" : "border-border",
        )}
        {...props}
      />
      <p id={errorId} aria-live="polite" className={cn("min-h-5 text-sm", error ? "text-danger" : "text-muted-foreground")}>
        {error ?? hint}
      </p>
    </div>
  );
}
