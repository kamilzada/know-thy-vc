import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl text-foreground", className)}>
      Know Thy <span className="gradient-text">VC</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl bg-signature-diag font-display text-sm text-white", className)}>
      VC
    </span>
  );
}
