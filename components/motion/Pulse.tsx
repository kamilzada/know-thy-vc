"use client";

import { motion } from "framer-motion";

/** Label dots and the active step: scale [1,1.3,1], opacity [1,.7,1], 2s loop. */
export function Pulse({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={className}
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
