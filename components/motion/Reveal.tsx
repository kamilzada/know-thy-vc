"use client";

import { motion, type Variants } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const VIEWPORT = { once: true, amount: 0.15, margin: "-60px" } as const;

/** fadeInUp 0.7s on scroll into view. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: fadeInUp.hidden, show: { ...(fadeInUp.show as object), transition: { duration: 0.7, ease: EASE, delay } } }}
    >
      {children}
    </motion.div>
  );
}

/** Children stagger in 0.1s apart. Wrap each child in <StaggerItem>. */
export function Stagger({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "ol" | "ul" }) {
  const Component = motion[as];
  return (
    <Component className={className} initial="hidden" whileInView="show" viewport={VIEWPORT} variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={fadeInUp}>
      {children}
    </Component>
  );
}
