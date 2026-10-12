import { cn } from "@/lib/cn";

/** Headline words only; never body copy. */
export function GradientText({ children, underline, className }: { children: React.ReactNode; underline?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="gradient-text">{children}</span>
      {underline && (
        <span aria-hidden className="absolute -bottom-1 left-0 h-[0.12em] w-full rounded-full bg-signature opacity-30 md:-bottom-2" />
      )}
    </span>
  );
}
