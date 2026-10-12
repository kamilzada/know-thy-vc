"use client";

import { motion } from "framer-motion";

/** Rotating dashed ring, a bobbing mini-card, dot grid, accent corner block and a soft glow. Decorative. */
export function HeroGraphic() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="absolute inset-[12%] rounded-full bg-accent/[0.08] blur-3xl" />
      <motion.div
        className="absolute inset-[6%] rounded-full border-2 border-dashed border-accent/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-[22%] rounded-full border border-border bg-card/60 shadow-[var(--shadow-xl)] backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-signature-diag font-display text-4xl text-white shadow-[var(--shadow-accent-lg)]">
          VC
        </span>
      </div>

      <div className="absolute right-[2%] top-[4%] grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/30" />
        ))}
      </div>
      <div className="absolute bottom-[6%] left-[4%] h-14 w-14 rounded-2xl bg-signature-diag opacity-90" />

      <motion.div
        className="absolute left-[-4%] top-[20%] rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-lg)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Portfolio</p>
        <p className="mt-1 text-sm font-semibold">Led Seed · 14 days ago</p>
      </motion.div>

    </div>
  );
}
