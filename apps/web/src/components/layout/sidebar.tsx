'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, CreditCard, AlertTriangle,
  FileText, ArrowLeftRight, Package, Activity, Settings,
  Webhook, Bell, LogOut, ChevronUp,
} from 'lucide-react';
import { logout } from '@/lib/api';
import { useMe } from '@/lib/queries/me';

/** Grouped by how an ops person thinks: money first, people, then plumbing. */
const NAV_GROUPS: { label?: string; items: { href: string; icon: any; label: string }[] }[] = [
  {
    items: [{ href: '/dashboard', icon: LayoutDashboard, label: 'Overview' }],
  },
  {
    label: 'Money',
    items: [
      { href: '/dashboard/subscriptions', icon: CreditCard, label: 'Subscriptions' },
      { href: '/dashboard/invoices', icon: FileText, label: 'Invoices' },
      { href: '/dashboard/transfers', icon: ArrowLeftRight, label: 'Transfers' },
      { href: '/dashboard/dunning', icon: AlertTriangle, label: 'Dunning' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/dashboard/customers', icon: Users, label: 'Customers' },
      { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Build',
    items: [
      { href: '/dashboard/catalog', icon: Package, label: 'Catalog' },
      { href: '/dashboard/webhooks', icon: Webhook, label: 'Webhooks' },
      { href: '/dashboard/events', icon: Activity, label: 'Events' },
    ],
  },
];

const PILL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { data: tenant } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleSignOut() {
    logout();
    router.push('/login');
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-line">
      {/* Wordmark + mode */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/plinth-logo.png" alt="" width={26} height={26} className="shrink-0" priority />
          <span className="font-display text-[16px] font-semibold tracking-tight text-ink">
            Plinth
          </span>
        </Link>
        <span className="rounded-full bg-warn-tint px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-warn">
          Test
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && (
              <p className="label-mono px-2.5 pb-1.5 pt-5 text-[10px] text-faint">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-tour={`nav-item-${label.toLowerCase()}`}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors duration-150',
                      active ? 'font-medium text-ink' : 'text-mid hover:bg-soft/70 hover:text-ink',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-lg border border-line bg-card shadow-card"
                        transition={reduce ? { duration: 0 } : PILL_SPRING}
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className={cn(
                        'relative z-10 transition-colors duration-150',
                        active ? 'text-jade' : 'text-faint group-hover:text-mid',
                      )}
                    />
                    <span className="relative z-10 flex-1">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + tenant — one relative wrapper so the dropdown clears BOTH rows */}
      <div className="border-t border-line px-3 py-3">
        <div className="relative" ref={menuRef}>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={reduce ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="pop-shadow absolute bottom-full left-0 right-0 z-20 mb-1.5 origin-bottom overflow-hidden rounded-xl border border-line bg-card"
              >
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-danger transition-colors duration-150 hover:bg-danger-tint"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link
            href="/dashboard/settings"
            data-tour="nav-item-settings"
            className={cn(
              'group relative mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors duration-150',
              isActive('/dashboard/settings') ? 'font-medium text-ink' : 'text-mid hover:bg-soft/70 hover:text-ink',
            )}
          >
            {isActive('/dashboard/settings') && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-lg border border-line bg-card shadow-card"
                transition={reduce ? { duration: 0 } : PILL_SPRING}
              />
            )}
            <Settings
              size={16}
              strokeWidth={1.75}
              className={cn('relative z-10', isActive('/dashboard/settings') ? 'text-jade' : 'text-faint')}
            />
            <span className="relative z-10">Settings</span>
          </Link>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-soft/70"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-jade-tint">
              <span className="text-[11px] font-bold text-jade-deep">
                {(tenant?.name ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">
                {tenant?.name ?? 'Loading…'}
              </p>
              <p className="truncate font-mono text-[10.5px] text-faint">{tenant?.id ?? ''}</p>
            </div>
            <motion.span
              animate={{ rotate: menuOpen ? 0 : 180 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }}
              className="text-faint"
            >
              <ChevronUp size={14} />
            </motion.span>
          </button>
        </div>
      </div>
    </aside>
  );
}
