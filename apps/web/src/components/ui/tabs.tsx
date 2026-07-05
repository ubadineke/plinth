'use client';
import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

const UNDERLINE_SPRING = { type: 'spring' as const, stiffness: 400, damping: 32 };

/** Underline tabs — selection is ink, jade stays reserved for actions. The
 * underline itself slides between tabs via a shared layoutId. */
export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const layoutId = useId();
  const reduce = useReducedMotion();

  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3.5 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150 -mb-px',
              active ? 'text-ink' : 'text-mid hover:text-body',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-px font-mono text-[10.5px] transition-colors duration-150',
                  active ? 'bg-ink text-card' : 'bg-soft text-mid',
                )}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={`tab-underline-${layoutId}`}
                className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                transition={reduce ? { duration: 0 } : UNDERLINE_SPRING}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
