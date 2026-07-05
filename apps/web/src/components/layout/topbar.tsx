'use client';
import { ThemeToggle } from './theme-toggle';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-canvas px-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-xs text-mid">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label="Search">
          <Search size={16} strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Notifications" className="relative">
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-jade" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
