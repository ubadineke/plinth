'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── ANIMATION STORYBOARD — Modal ────────────────────────────
 *    0ms   backdrop fades in (blur + dim)
 *    0ms   panel scales 0.96 -> 1.0, rises 8px, fades in (spring)
 *  exit    panel scales/fades out, backdrop fades out
 * ──────────────────────────────────────────────────────────── */
const BACKDROP_FADE = 0.22;
const PANEL_SPRING = { type: 'spring' as const, visualDuration: 0.32, bounce: 0.16 };
const PANEL_SCALE = 0.96;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, subtitle, icon, className, children }: ModalProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : BACKDROP_FADE }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : PANEL_SCALE, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : PANEL_SCALE, y: reduce ? 0 : 8 }}
            transition={reduce ? { duration: 0 } : PANEL_SPRING}
            className={cn(
              'relative w-full max-w-md rounded-2xl border border-line bg-card p-6 pop-shadow',
              className,
            )}
          >
            {(title || icon) && (
              <div className="mb-4 flex items-start justify-between">
                <div>
                  {icon && (
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-jade-tint">
                      {icon}
                    </div>
                  )}
                  {title && (
                    <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="mt-0.5 text-xs text-mid">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="mt-1 shrink-0 text-faint transition-colors duration-150 hover:text-mid"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Side drawer — same backdrop, panel slides in from the right instead of scaling centered. */
const DRAWER_SPRING = { type: 'spring' as const, stiffness: 340, damping: 34 };

export function Drawer({ open, onClose, className, children }: Omit<ModalProps, 'title' | 'subtitle' | 'icon'>) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : BACKDROP_FADE }}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: reduce ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : '100%' }}
            transition={reduce ? { duration: 0 } : DRAWER_SPRING}
            className={cn(
              'absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card pop-shadow',
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
