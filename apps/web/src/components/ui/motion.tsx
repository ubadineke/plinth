'use client';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Entrance choreography (DESIGN.md): rise+fade, 450-650ms, 50ms stagger.
 * Wrap a page's sections in <Stagger>, each block in <Rise>.
 */
export function Stagger({
  children,
  className,
  stagger = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? undefined : 'hidden'}
      animate="show"
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function Rise({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: EASE, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
